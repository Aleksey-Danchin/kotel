import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Session } from '~prisma/client/client';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthenticatedRequest } from './session-request';
import { SessionService } from './session.service';

type Source = 'cookie' | 'bearer';

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { token, source } = this.extractToken(request);
    const hash = createHash('sha256').update(token).digest('hex');
    const session = await this.sessionService.findByAccessTokenHash(hash);

    if (!session || session.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    const now = new Date();
    if (session.accessTokenExpiresAt < now) {
      await this.sessionService.markExpired(session.id, now);
      throw new UnauthorizedException();
    }

    this.verifyOrigin(request, session.fingerprint);
    await this.verifyClientType(source, session);

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = session.user;
    authenticatedRequest.session = {
      id: session.id,
      sessionId: session.sessionId,
      clientType: session.clientType,
    };

    return true;
  }

  private extractToken(request: Request): { token: string; source: Source } {
    const cookieToken =
      typeof request.cookies?.accessToken === 'string'
        ? request.cookies.accessToken
        : null;
    const bearerToken = this.extractBearerToken(request.headers.authorization);

    if (cookieToken && bearerToken) {
      throw new UnauthorizedException();
    }
    if (!cookieToken && !bearerToken) {
      throw new UnauthorizedException();
    }

    if (cookieToken) {
      return { token: cookieToken, source: 'cookie' };
    }

    return { token: bearerToken!, source: 'bearer' };
  }

  private extractBearerToken(
    authorization: string | string[] | undefined,
  ): string | null {
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token.trim() || null;
  }

  private async verifyClientType(
    source: Source,
    session: Session,
  ): Promise<void> {
    const mismatch =
      (session.clientType === 'WEB' && source !== 'cookie') ||
      (session.clientType === 'EXPO' && source !== 'bearer');

    if (mismatch) {
      await this.sessionService.handleChannelMismatch(session);
      throw new UnauthorizedException();
    }
  }

  private verifyOrigin(request: Request, fingerprint: string): void {
    const requestOrigin = this.getOrigin(request);
    if (!requestOrigin || requestOrigin === fingerprint) {
      return;
    }

    if (request.method.toUpperCase() === 'GET') {
      this.logger.warn(
        `Origin mismatch for read request: expected ${fingerprint}, received ${requestOrigin}`,
      );
      return;
    }

    throw new ForbiddenException();
  }

  private getOrigin(request: Request): string | null {
    const originHeader = request.headers.origin;
    if (typeof originHeader === 'string' && originHeader.trim()) {
      return originHeader;
    }

    const refererHeader = request.headers.referer;
    if (typeof refererHeader !== 'string' || !refererHeader.trim()) {
      return null;
    }

    try {
      return new URL(refererHeader).origin;
    } catch {
      return null;
    }
  }
}
