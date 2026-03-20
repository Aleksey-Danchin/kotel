import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionModule } from './session.module';
import type { SessionService } from './session.service';

describe('SessionModule lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('runs cleanup immediately and every hour', async () => {
    const cleanupStaleSessions = vi.fn().mockResolvedValue(0);
    const sessionService = {
      cleanupStaleSessions,
    } as unknown as SessionService;

    const sessionModule = new SessionModule(sessionService);
    await sessionModule.onModuleInit();

    expect(cleanupStaleSessions).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(cleanupStaleSessions).toHaveBeenCalledTimes(2);

    sessionModule.onModuleDestroy();
    vi.useRealTimers();
  });

  it('clears cleanup interval on destroy', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const sessionService = {
      cleanupStaleSessions: vi.fn().mockResolvedValue(0),
    } as unknown as SessionService;

    const sessionModule = new SessionModule(sessionService);
    await sessionModule.onModuleInit();
    sessionModule.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    clearIntervalSpy.mockRestore();
    vi.useRealTimers();
  });
});
