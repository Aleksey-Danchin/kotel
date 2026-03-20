export const SESSION_COOKIE_NAME = 'session';
export const SESSION_COOKIE_PATH = '/api';

export const getSessionCookieDomain = (): string =>
  process.env.SESSION_COOKIE_DOMAIN ?? 'kotel.localhost';

export const getSessionCookieOptions = () => ({
  domain: getSessionCookieDomain(),
  httpOnly: true,
  path: SESSION_COOKIE_PATH,
  secure: true,
});
