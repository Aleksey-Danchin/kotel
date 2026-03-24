export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const ACCESS_TOKEN_PATH = '/api/';
export const REFRESH_TOKEN_PATH = '/api/session/refresh';

export function getSessionCookieDomain(): string {
  const value = process.env.SESSION_COOKIE_DOMAIN;
  if (!value || value.trim().length === 0) {
    throw new Error('SESSION_COOKIE_DOMAIN is required');
  }
  return value;
}

export function getAccessTokenTtlSeconds(): number {
  return Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 900;
}

export function getRefreshTokenTtlSeconds(): number {
  return Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 2_592_000;
}

export function getAccessTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: ACCESS_TOKEN_PATH,
    domain: getSessionCookieDomain(),
    maxAge: getAccessTokenTtlSeconds() * 1000,
  };
}

export function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: REFRESH_TOKEN_PATH,
    domain: getSessionCookieDomain(),
    maxAge: getRefreshTokenTtlSeconds() * 1000,
  };
}
