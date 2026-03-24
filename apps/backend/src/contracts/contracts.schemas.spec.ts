import { describe, expect, it } from 'vitest';
import {
  ADMIN_API_PATHS,
  AUTH_API_PATHS,
  SESSION_API_PATHS,
  SETUP_API_PATHS,
  createUserSchema,
  loginFormSchema,
  logoutSchema,
  revokeSessionsSchema,
  setupInitSchema,
  tokenExchangeSchema,
} from './index';

describe('contracts zod schemas', () => {
  it('validates auth schemas', () => {
    const loginResult = loginFormSchema.safeParse({
      login: 'admin',
      password: 'secret',
      redirect_uri: 'https://kris.localhost/callback',
      code_challenge: 'x'.repeat(43),
      code_challenge_method: 'S256',
      state: 'state-1',
    });
    expect(loginResult.success).toBe(true);

    const tokenResult = tokenExchangeSchema.safeParse({
      code: 'auth-code',
      codeVerifier: 'y'.repeat(43),
    });
    expect(tokenResult.success).toBe(true);
  });

  it('validates session and setup schemas', () => {
    const logoutResult = logoutSchema.safeParse({});
    expect(logoutResult.success).toBe(true);
    if (logoutResult.success) {
      expect(logoutResult.data.allDevices).toBe(false);
    }

    const setupResult = setupInitSchema.safeParse({
      login: 'admin',
      password: 'secret',
      fullname: 'Admin User',
    });
    expect(setupResult.success).toBe(true);
  });

  it('validates admin schemas', () => {
    const createUserResult = createUserSchema.safeParse({
      login: 'user1',
      password: 'pass',
      fullname: 'User One',
    });
    expect(createUserResult.success).toBe(true);
    if (createUserResult.success) {
      expect(createUserResult.data.role).toBe('USER');
    }

    const revokeResult = revokeSessionsSchema.safeParse({
      userId: 'user-id',
      reason: 'security',
    });
    expect(revokeResult.success).toBe(true);
  });
});

describe('contracts api paths', () => {
  it('exports stable API path constants', () => {
    expect(AUTH_API_PATHS).toEqual({
      login: '/api/auth/login',
      token: '/api/auth/token',
    });
    expect(SESSION_API_PATHS).toEqual({
      status: '/api/session/status',
      refresh: '/api/session/refresh',
      logout: '/api/session/logout',
    });
    expect(ADMIN_API_PATHS).toEqual({
      users: '/api/admin/users',
      revokeSessions: '/api/admin/sessions/revoke',
    });
    expect(SETUP_API_PATHS).toEqual({
      status: '/api/setup/status',
      init: '/api/setup/init',
    });
  });
});
