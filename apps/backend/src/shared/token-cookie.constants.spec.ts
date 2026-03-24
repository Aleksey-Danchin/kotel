import { describe, expect, it, vi } from 'vitest';
import { hashToken, generateToken } from './token.utils';
import {
  getAccessTokenCookieOptions,
  getAccessTokenTtlSeconds,
  getRefreshTokenCookieOptions,
  getRefreshTokenTtlSeconds,
  getSessionCookieDomain,
} from './cookie.constants';

describe('token.utils', () => {
  it('generateToken returns 64-char lowercase hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashToken returns deterministic sha256 hex digest', () => {
    const token = 'sample-token';
    const digest = hashToken(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toBe(digest);
  });
});

describe('cookie.constants', () => {
  it('getSessionCookieDomain throws when env var is missing', () => {
    vi.stubEnv('SESSION_COOKIE_DOMAIN', '');
    expect(() => getSessionCookieDomain()).toThrow(
      'SESSION_COOKIE_DOMAIN is required',
    );
    vi.unstubAllEnvs();
  });

  it('builds secure cookie options with expected defaults and flags', () => {
    vi.stubEnv('SESSION_COOKIE_DOMAIN', '.kris.localhost');
    vi.stubEnv('ACCESS_TOKEN_TTL_SECONDS', '100');
    vi.stubEnv('REFRESH_TOKEN_TTL_SECONDS', '200');

    const accessOptions = getAccessTokenCookieOptions();
    const refreshOptions = getRefreshTokenCookieOptions();

    expect(accessOptions).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/',
      domain: '.kris.localhost',
      maxAge: 100_000,
    });
    expect(refreshOptions).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/session/refresh',
      domain: '.kris.localhost',
      maxAge: 200_000,
    });
    vi.unstubAllEnvs();
  });

  it('uses fallback ttl defaults when env is invalid', () => {
    vi.stubEnv('ACCESS_TOKEN_TTL_SECONDS', 'NaN');
    vi.stubEnv('REFRESH_TOKEN_TTL_SECONDS', '');

    expect(getAccessTokenTtlSeconds()).toBe(900);
    expect(getRefreshTokenTtlSeconds()).toBe(2_592_000);
    vi.unstubAllEnvs();
  });
});
