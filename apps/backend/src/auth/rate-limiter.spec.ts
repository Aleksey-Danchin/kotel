import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  const ip = '127.0.0.1';
  const username = 'tester';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    limiter = new RateLimiter();
  });

  afterEach(() => {
    limiter.onModuleDestroy();
    vi.useRealTimers();
  });

  it('allows first attempt', () => {
    const result = limiter.checkLimits(ip, username);

    expect(result).toEqual({
      allowed: true,
      captchaRequired: false,
      delayMs: 0,
    });
  });

  it('requires captcha after three failed attempts', () => {
    limiter.recordFailedAttempt(ip, username);
    limiter.recordFailedAttempt(ip, username);
    limiter.recordFailedAttempt(ip, username);

    const result = limiter.checkLimits(ip, username);

    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).toBe(true);
    expect(result.delayMs).toBe(5_000);
  });

  it('requires captcha from the fourth attempt', () => {
    for (let i = 0; i < 4; i += 1) {
      limiter.recordFailedAttempt(ip, username);
    }

    const result = limiter.checkLimits(ip, username);

    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).toBe(true);
    expect(result.delayMs).toBe(5_000);
  });

  it('blocks ip on seventh attempt', () => {
    for (let i = 0; i < 7; i += 1) {
      limiter.recordFailedAttempt(ip, username);
    }

    const result = limiter.checkLimits(ip, username);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ip_blocked');
  });

  it('blocks username on tenth attempt across different ips', () => {
    for (let i = 0; i < 10; i += 1) {
      limiter.recordFailedAttempt(`10.0.0.${i}`, username);
    }

    const result = limiter.checkLimits('10.0.1.1', username);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('username_blocked');
  });

  it('resets username counter after successful login', () => {
    for (let i = 0; i < 9; i += 1) {
      limiter.recordFailedAttempt(`10.1.0.${i}`, username);
    }
    limiter.resetUsername(username);

    const result = limiter.checkLimits('10.1.1.1', username);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('allows attempts again after the window expires', () => {
    for (let i = 0; i < 7; i += 1) {
      limiter.recordFailedAttempt(ip, username);
    }
    expect(limiter.checkLimits(ip, username).allowed).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    const result = limiter.checkLimits(ip, username);
    expect(result).toEqual({
      allowed: true,
      captchaRequired: false,
      delayMs: 0,
    });
  });

  it('keeps counters independent for different ips', () => {
    for (let i = 0; i < 7; i += 1) {
      limiter.recordFailedAttempt('192.168.0.1', username);
    }

    const blockedIp = limiter.checkLimits('192.168.0.1', username);
    const otherIp = limiter.checkLimits('192.168.0.2', username);

    expect(blockedIp.allowed).toBe(false);
    expect(otherIp.allowed).toBe(true);
  });

  it('keeps username counters independent', () => {
    for (let i = 0; i < 10; i += 1) {
      limiter.recordFailedAttempt(ip, 'alice');
    }

    const blockedUser = limiter.checkLimits(ip, 'alice');
    const otherUser = limiter.checkLimits('10.10.10.10', 'bob');

    expect(blockedUser.allowed).toBe(false);
    expect(blockedUser.reason).toBe('username_blocked');
    expect(otherUser.allowed).toBe(true);
  });

  it('returns retryAfterSeconds when blocked', () => {
    for (let i = 0; i < 7; i += 1) {
      limiter.recordFailedAttempt(ip, username);
    }

    const result = limiter.checkLimits(ip, username);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeTypeOf('number');
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
