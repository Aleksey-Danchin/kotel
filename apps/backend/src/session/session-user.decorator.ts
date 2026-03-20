import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '~prisma/client/client';
import type { SessionRequest } from './session-request';

export const SessionUser = createParamDecorator(
  async (_: unknown, context: ExecutionContext): Promise<User | null> => {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    if (!request.getSessionUser) {
      throw new UnauthorizedException();
    }

    return request.getSessionUser();
  },
);
