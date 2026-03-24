import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionModule } from './session.module';

describe('SessionModule', () => {
  const sessionService = {
    cleanupExpiredSessions: vi.fn(),
  };

  let moduleRef: SessionModule;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sessionService.cleanupExpiredSessions.mockResolvedValue(0);
    moduleRef = new SessionModule(sessionService as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs cleanup on module init and every hour', async () => {
    await moduleRef.onModuleInit();
    expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(3);
  });

  it('stops cleanup interval on module destroy', async () => {
    await moduleRef.onModuleInit();
    expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(1);

    moduleRef.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);

    expect(sessionService.cleanupExpiredSessions).toHaveBeenCalledTimes(1);
  });
});
