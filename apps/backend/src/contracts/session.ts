export type { SigninDto } from '../session/session.contract';

export const SESSION_API_PATHS = {
  signin: '/api/session/signin',
  signout: '/api/session/signout',
  check: '/api/session/check',
} as const;
