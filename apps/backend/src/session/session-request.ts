import type { Request } from 'express';
import type { User } from '~prisma/client/client';

export type SessionRequest = Request & {
  getSessionUser?: () => Promise<User | null>;
};
