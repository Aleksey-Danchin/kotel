import { describe, expect, it } from 'vitest';
import { SessionService } from './session.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('SessionService env config', () => {
  it('throws when IDLE_TIMEOUT is missing', () => {
    const previousValue = process.env.IDLE_TIMEOUT;
    delete process.env.IDLE_TIMEOUT;

    expect(() => new SessionService({} as PrismaService)).toThrowError(
      'IDLE_TIMEOUT is required',
    );

    if (previousValue) {
      process.env.IDLE_TIMEOUT = previousValue;
    } else {
      delete process.env.IDLE_TIMEOUT;
    }
  });

  it('throws when IDLE_TIMEOUT is invalid', () => {
    const previousValue = process.env.IDLE_TIMEOUT;
    process.env.IDLE_TIMEOUT = '0';

    expect(() => new SessionService({} as PrismaService)).toThrowError(
      'IDLE_TIMEOUT must be a positive number',
    );

    if (previousValue) {
      process.env.IDLE_TIMEOUT = previousValue;
    } else {
      delete process.env.IDLE_TIMEOUT;
    }
  });
});
