import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
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

const normalizeOptions = (
  options?: SessionGuardOptions,
): Required<SessionGuardOptions> => ({
  strong: options?.strong ?? true,
});

@Injectable()
export class SessionGuard implements CanActivate {
  private static sessionService: SessionService | null = null;

  private readonly options: Required<SessionGuardOptions>;

  constructor(
    @Optional()
    @Inject(SESSION_GUARD_OPTIONS)
    options?: SessionGuardOptions,
  ) {
    this.options = normalizeOptions(options);
  }

  static bindSessionService(sessionService: SessionService): void {
    SessionGuard.sessionService = sessionService;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const response = context.switchToHttp().getResponse();
    const sessionService = SessionGuard.sessionService;

    if (!sessionService) {
      throw new UnauthorizedException();
    }

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
      const result = await sessionService.check(sessionKey);
      if (result.stale) {
        response.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
      }
      memoizedUser = result.user;
      return memoizedUser;
    };

    const sessionUser = await request.getSessionUser();
    if (this.options.strong && !sessionUser) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
