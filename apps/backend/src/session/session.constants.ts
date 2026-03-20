export const SESSION_COOKIE_NAME = 'session';
export const SESSION_COOKIE_PATH = '/api';

export const getSessionCookieDomain = (): string => {
  const value = process.env.SESSION_COOKIE_DOMAIN;
  if (!value || value.trim().length === 0) {
    throw new Error('SESSION_COOKIE_DOMAIN is required');
  }

  return value;
};

export const getSessionCookieOptions = () => ({
  domain: getSessionCookieDomain(),
  httpOnly: true,
  path: SESSION_COOKIE_PATH,
  secure: true,
});
