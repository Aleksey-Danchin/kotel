import type { Request } from 'express';
import type { ClientType, User } from '~prisma/client/client';

export type SessionInfo = {
  id: string;
  sessionId: string;
  clientType: ClientType;
};

export type AuthenticatedRequest = Request & {
  user: User;
  session: SessionInfo;
};
