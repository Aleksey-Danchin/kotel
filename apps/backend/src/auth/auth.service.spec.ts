import { createHash } from 'node:crypto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('AuthService', () => {
  const prismaService = {
    client: {
      user: {
        findUnique: vi.fn(),
      },
    },
  };

  const sessionService = {
    createSession: vi.fn(),
  };

  const codeStore = {
    store: vi.fn(),
    consume: vi.fn(),
  };

  let service: AuthService;
  const mockedBcrypt = vi.mocked(bcrypt);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_COOKIE_DOMAIN = 'kotel.localhost';
    service = new AuthService(
      prismaService as never,
      sessionService as never,
      codeStore as never,
    );
  });

  it('login with valid credentials returns redirect and stores auth code', async () => {
    prismaService.client.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      passwordHash: 'hash',
    });
    mockedBcrypt.compare.mockResolvedValueOnce(true);

    const result = await service.login({
      login: 'user1',
      password: '123',
      redirect_uri: 'https://kotel.localhost/callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'S256',
      state: 'state-1',
    });

    expect(result.redirect).toMatch(
      /^https:\/\/kotel\.localhost\/callback\?code=[a-f0-9]{64}&state=state-1$/,
    );
    expect(codeStore.store).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      {
        codeChallenge: 'a'.repeat(43),
        redirectUri: 'https://kotel.localhost/callback',
        state: 'state-1',
        userId: 'user-1',
        clientType: 'WEB',
      },
    );
  });

  it('login with invalid login throws 401', async () => {
    prismaService.client.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.login({
        login: 'missing',
        password: '123',
        redirect_uri: 'https://kotel.localhost/callback',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        state: 'state-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login with wrong password throws 401', async () => {
    prismaService.client.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      passwordHash: 'hash',
    });
    mockedBcrypt.compare.mockResolvedValueOnce(false);

    await expect(
      service.login({
        login: 'user1',
        password: 'wrong',
        redirect_uri: 'https://kotel.localhost/callback',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        state: 'state-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('exchangeCode with valid WEB code returns sessionId and sets cookies', async () => {
    const codeVerifier = 'v'.repeat(43);
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    codeStore.consume.mockReturnValueOnce({
      userId: 'user-1',
      codeChallenge,
      redirectUri: 'https://kotel.localhost/callback',
      state: 'state-1',
      clientType: 'WEB',
      createdAt: Date.now(),
    });
    sessionService.createSession.mockResolvedValueOnce({});
    const response = { cookie: vi.fn() };

    const result = await service.exchangeCode(
      { code: 'code-1', codeVerifier },
      response as never,
    );

    expect(result).toEqual({ sessionId: expect.any(String) });
    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'accessToken',
      expect.any(String),
      expect.objectContaining({ path: '/api/' }),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      'refreshToken',
      expect.any(String),
      expect.objectContaining({ path: '/api/session/refresh' }),
    );
    expect(sessionService.createSession).toHaveBeenCalledTimes(1);
  });

  it('exchangeCode with valid EXPO code returns tokens in body', async () => {
    const codeVerifier = 'v'.repeat(43);
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    codeStore.consume.mockReturnValueOnce({
      userId: 'user-1',
      codeChallenge,
      redirectUri: 'exp://127.0.0.1:8081/--/callback',
      state: 'state-1',
      clientType: 'EXPO',
      createdAt: Date.now(),
    });
    sessionService.createSession.mockResolvedValueOnce({});
    const response = { cookie: vi.fn() };

    const result = await service.exchangeCode(
      { code: 'code-1', codeVerifier },
      response as never,
    );

    expect(result).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      sessionId: expect.any(String),
    });
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('exchangeCode with invalid code verifier throws 400', async () => {
    codeStore.consume.mockReturnValueOnce({
      userId: 'user-1',
      codeChallenge: 'expected-challenge',
      redirectUri: 'https://kotel.localhost/callback',
      state: 'state-1',
      clientType: 'WEB',
      createdAt: Date.now(),
    });

    await expect(
      service.exchangeCode({ code: 'code-1', codeVerifier: 'wrong' }, {
        cookie: vi.fn(),
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exchangeCode with expired or consumed code throws 400', async () => {
    codeStore.consume.mockReturnValueOnce(null).mockReturnValueOnce(null);

    await expect(
      service.exchangeCode({ code: 'expired', codeVerifier: 'v'.repeat(43) }, {
        cookie: vi.fn(),
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.exchangeCode({ code: 'consumed', codeVerifier: 'v'.repeat(43) }, {
        cookie: vi.fn(),
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('login resolves client type from redirect uri protocol', async () => {
    prismaService.client.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'hash',
    });
    mockedBcrypt.compare.mockResolvedValue(true);

    await service.login({
      login: 'user1',
      password: '123',
      redirect_uri: 'https://kotel.localhost/callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'S256',
      state: 'web',
    });
    await service.login({
      login: 'user1',
      password: '123',
      redirect_uri: 'kotel://auth/callback',
      code_challenge: 'b'.repeat(43),
      code_challenge_method: 'S256',
      state: 'expo',
    });

    expect(codeStore.store).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ clientType: 'WEB' }),
    );
    expect(codeStore.store).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ clientType: 'EXPO' }),
    );
  });
});
