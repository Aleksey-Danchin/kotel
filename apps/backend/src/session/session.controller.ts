import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from './public.decorator';
import { SessionService } from './session.service';

type TokenSource = 'cookie' | 'bearer';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Public()
  @Post('refresh')
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<
    | { sessionId: string }
    | { accessToken: string; refreshToken: string; sessionId: string }
  > {
    const { token, source } = this.extractRefreshToken(request);
    return this.sessionService.refreshSession(token, source, response);
  }

  private extractRefreshToken(request: Request): {
    token: string;
    source: TokenSource;
  } {
    const cookieToken =
      typeof request.cookies?.refreshToken === 'string'
        ? request.cookies.refreshToken
        : null;
    if (cookieToken) {
      return { token: cookieToken, source: 'cookie' };
    }

    const bearerToken = this.extractBearerToken(request.headers.authorization);
    if (bearerToken) {
      return { token: bearerToken, source: 'bearer' };
    }

    throw new UnauthorizedException();
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

    const trimmed = token.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
