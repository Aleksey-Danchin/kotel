import { describe, expect, it } from 'vitest';
import { getSessionCookieDomain } from './session.constants';

describe('Session cookie env config', () => {
  it('throws when SESSION_COOKIE_DOMAIN is missing', () => {
    const previousValue = process.env.SESSION_COOKIE_DOMAIN;
    delete process.env.SESSION_COOKIE_DOMAIN;

    expect(() => getSessionCookieDomain()).toThrowError(
      'SESSION_COOKIE_DOMAIN is required',
    );

    if (previousValue) {
      process.env.SESSION_COOKIE_DOMAIN = previousValue;
    } else {
      delete process.env.SESSION_COOKIE_DOMAIN;
    }
  });

  it('returns SESSION_COOKIE_DOMAIN when present', () => {
    const previousValue = process.env.SESSION_COOKIE_DOMAIN;
    process.env.SESSION_COOKIE_DOMAIN = 'kotel.localhost';

    expect(getSessionCookieDomain()).toBe('kotel.localhost');

    if (previousValue) {
      process.env.SESSION_COOKIE_DOMAIN = previousValue;
    } else {
      delete process.env.SESSION_COOKIE_DOMAIN;
    }
  });
});
