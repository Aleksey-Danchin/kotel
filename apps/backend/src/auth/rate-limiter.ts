import { Injectable, OnModuleDestroy } from '@nestjs/common';

type CounterKey = string;

export type RateLimitReason = 'ip_blocked' | 'username_blocked';

export type RateLimitResult = {
  allowed: boolean;
  captchaRequired: boolean;
  retryAfterSeconds?: number;
  reason?: RateLimitReason;
  delayMs: number;
};

@Injectable()
export class RateLimiter implements OnModuleDestroy {
  private readonly ipCounters = new Map<CounterKey, number[]>();
  private readonly usernameCounters = new Map<CounterKey, number[]>();
  private readonly windowMs =
    this.getPositiveIntEnv('RATE_LIMIT_WINDOW_SECONDS', 15 * 60) * 1000;
  private readonly ipCaptchaThreshold = this.getPositiveIntEnv(
    'RATE_LIMIT_IP_CAPTCHA_THRESHOLD',
    4,
  );
  private readonly ipBlockThreshold = this.getPositiveIntEnv(
    'RATE_LIMIT_IP_BLOCK_THRESHOLD',
    7,
  );
  private readonly usernameBlockThreshold = this.getPositiveIntEnv(
    'RATE_LIMIT_USERNAME_BLOCK_THRESHOLD',
    10,
  );
  private readonly captchaDelayMs = 5_000;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => this.purgeExpired(),
      5 * 60 * 1000,
    );
  }

  checkLimits(ip: string, username: string): RateLimitResult {
    const now = Date.now();
    const ipKey = this.normalizeIp(ip);
    const usernameKey = this.normalizeUsername(username);

    const ipTimestamps = this.getActiveTimestamps(this.ipCounters, ipKey, now);
    const usernameTimestamps = this.getActiveTimestamps(
      this.usernameCounters,
      usernameKey,
      now,
    );

    if (usernameTimestamps.length >= this.usernameBlockThreshold - 1) {
      return {
        allowed: false,
        captchaRequired: false,
        retryAfterSeconds: this.getRetryAfterSeconds(
          usernameTimestamps[0],
          now,
        ),
        reason: 'username_blocked',
        delayMs: 0,
      };
    }

    if (ipTimestamps.length >= this.ipBlockThreshold - 1) {
      return {
        allowed: false,
        captchaRequired: false,
        retryAfterSeconds: this.getRetryAfterSeconds(ipTimestamps[0], now),
        reason: 'ip_blocked',
        delayMs: 0,
      };
    }

    const captchaRequired = ipTimestamps.length >= this.ipCaptchaThreshold - 1;
    return {
      allowed: true,
      captchaRequired,
      delayMs: captchaRequired ? this.captchaDelayMs : 0,
    };
  }

  recordFailedAttempt(ip: string, username: string): void {
    const now = Date.now();
    const ipKey = this.normalizeIp(ip);
    const usernameKey = this.normalizeUsername(username);
    this.pushTimestamp(this.ipCounters, ipKey, now);
    this.pushTimestamp(this.usernameCounters, usernameKey, now);
  }

  resetUsername(username: string): void {
    this.usernameCounters.delete(this.normalizeUsername(username));
  }

  resetAll(): void {
    this.ipCounters.clear();
    this.usernameCounters.clear();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  private pushTimestamp(
    counters: Map<CounterKey, number[]>,
    key: CounterKey,
    timestamp: number,
  ): void {
    const activeTimestamps = this.getActiveTimestamps(counters, key, timestamp);
    activeTimestamps.push(timestamp);
    counters.set(key, activeTimestamps);
  }

  private getActiveTimestamps(
    counters: Map<CounterKey, number[]>,
    key: CounterKey,
    now: number,
  ): number[] {
    const timestamps = counters.get(key) ?? [];
    const filtered = timestamps.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );
    if (filtered.length === 0) {
      counters.delete(key);
      return [];
    }
    counters.set(key, filtered);
    return filtered;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.ipCounters.entries()) {
      const filtered = timestamps.filter(
        (timestamp) => now - timestamp < this.windowMs,
      );
      if (filtered.length === 0) {
        this.ipCounters.delete(key);
        continue;
      }
      this.ipCounters.set(key, filtered);
    }

    for (const [key, timestamps] of this.usernameCounters.entries()) {
      const filtered = timestamps.filter(
        (timestamp) => now - timestamp < this.windowMs,
      );
      if (filtered.length === 0) {
        this.usernameCounters.delete(key);
        continue;
      }
      this.usernameCounters.set(key, filtered);
    }
  }

  private normalizeIp(ip: string): string {
    return ip.trim().toLowerCase() || 'unknown';
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase() || '<empty>';
  }

  private getRetryAfterSeconds(oldestTimestamp: number, now: number): number {
    const remainingMs = Math.max(this.windowMs - (now - oldestTimestamp), 1000);
    return Math.ceil(remainingMs / 1000);
  }

  private getPositiveIntEnv(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    if (!Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return Math.floor(value);
  }
}
