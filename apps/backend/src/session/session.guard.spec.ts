import { createHash } from 'node:crypto';
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionGuard } from './session.guard';

describe('SessionGuard', () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  };
  const sessionService = {
    findByAccessTokenHash: vi.fn(),
    markExpired: vi.fn(),
    handleChannelMismatch: vi.fn(),
  };

  let guard: SessionGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    guard = new SessionGuard(reflector as any, sessionService as any);
  });

  it('allows routes marked as @Public', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const request = { headers: {}, cookies: {} };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sessionService.findByAccessTokenHash).not.toHaveBeenCalled();
  });

  it('throws 401 when no token was provided', async () => {
    const context = createContext({ headers: {}, cookies: {} });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 when cookie and bearer are both provided', async () => {
    const context = createContext({
      headers: { authorization: 'Bearer bearer-token' },
      cookies: { accessToken: 'cookie-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 when session is missing', async () => {
    sessionService.findByAccessTokenHash.mockResolvedValue(null);
    const context = createContext({
      headers: { authorization: 'Bearer token' },
      cookies: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessionService.findByAccessTokenHash).toHaveBeenCalledWith(
      createHash('sha256').update('token').digest('hex'),
    );
  });

  it('expires session and throws 401 when token is expired', async () => {
    const session = buildSession({
      id: 'session-expired',
      accessTokenExpiresAt: new Date(Date.now() - 1_000),
      clientType: 'WEB',
    });
    sessionService.findByAccessTokenHash.mockResolvedValue(session);
    const context = createContext({
      headers: {},
      cookies: { accessToken: 'cookie-token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessionService.markExpired).toHaveBeenCalledWith(
      'session-expired',
      expect.any(Date),
    );
  });

  it('throws 401 on WEB session with bearer token', async () => {
    const session = buildSession({ clientType: 'WEB' });
    sessionService.findByAccessTokenHash.mockResolvedValue(session);
    const context = createContext({
      headers: { authorization: 'Bearer token' },
      cookies: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessionService.handleChannelMismatch).toHaveBeenCalledWith(session);
  });

  it('throws 401 on EXPO session with cookie token', async () => {
    const session = buildSession({ clientType: 'EXPO' });
    sessionService.findByAccessTokenHash.mockResolvedValue(session);
    const context = createContext({
      headers: {},
      cookies: { accessToken: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessionService.handleChannelMismatch).toHaveBeenCalledWith(session);
  });

  it('throws 403 for state-changing request on origin mismatch', async () => {
    sessionService.findByAccessTokenHash.mockResolvedValue(
      buildSession({ clientType: 'WEB' }),
    );
    const context = createContext({
      method: 'POST',
      headers: { origin: 'https://evil.localhost' },
      cookies: { accessToken: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('populates request.user and request.session for valid token', async () => {
    const session = buildSession({ clientType: 'EXPO' });
    sessionService.findByAccessTokenHash.mockResolvedValue(session);
    const request = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token',
        origin: 'exp://127.0.0.1:8081',
      },
      cookies: {},
    };
    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toEqual(session.user);
    expect((request as any).session).toEqual({
      id: session.id,
      sessionId: session.sessionId,
      clientType: session.clientType,
    });
  });
});

function createContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as unknown as ExecutionContext;
}

function buildSession(overrides: Record<string, unknown>) {
  return {
    id: 'session-1',
    sessionId: 'chain-1',
    userId: 'user-1',
    clientType: 'WEB',
    status: 'ACTIVE',
    fingerprint: 'exp://127.0.0.1:8081',
    accessTokenExpiresAt: new Date(Date.now() + 60_000),
    user: {
      id: 'user-1',
      fullname: 'User 1',
      login: 'user1',
      passwordHash: 'hash',
      role: 'ADMIN',
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
      updatedAt: new Date('2026-03-20T00:00:00.000Z'),
    },
    ...overrides,
  };
}
