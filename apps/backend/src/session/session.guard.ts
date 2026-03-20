import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { User } from '~prisma/client/client';
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from './session.constants';
import type { SessionRequest } from './session-request';
import { SessionService } from './session.service';

export type SessionGuardOptions = {
  strong?: boolean;
};

const SESSION_GUARD_OPTIONS = 'SESSION_GUARD_OPTIONS';

export const SessionGuardConfig = (options?: SessionGuardOptions) =>
  SetMetadata(SESSION_GUARD_OPTIONS, options);

const normalizeOptions = (
  options?: SessionGuardOptions,
): Required<SessionGuardOptions> => ({
  strong: options?.strong ?? true,
});

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const options = normalizeOptions(
      this.reflector.getAllAndOverride<SessionGuardOptions>(
        SESSION_GUARD_OPTIONS,
        [context.getHandler(), context.getClass()],
      ),
    );

    let hasResolved = false;
    let memoizedUser: User | null = null;

    request.getSessionUser = async () => {
      if (hasResolved) {
        return memoizedUser;
      }

      hasResolved = true;
      const sessionKey = request.cookies?.[SESSION_COOKIE_NAME] as
        | string
        | undefined;
      const result = await this.sessionService.check(sessionKey);
      if (result.stale) {
        response.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
      }
      memoizedUser = result.user;
      return memoizedUser;
    };

    const sessionUser = await request.getSessionUser();
    if (options.strong && !sessionUser) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
