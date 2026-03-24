import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CodeStore } from './code-store';

describe('CodeStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and consumes an entry once', () => {
    const store = new CodeStore();

    store.store('code-1', {
      codeChallenge: 'challenge',
      redirectUri: 'https://kotel.localhost/callback',
      state: 'state',
      userId: 'user-1',
      clientType: 'WEB',
    });

    const firstConsume = store.consume('code-1');
    const secondConsume = store.consume('code-1');

    expect(firstConsume).not.toBeNull();
    expect(firstConsume?.userId).toBe('user-1');
    expect(secondConsume).toBeNull();

    store.onModuleDestroy();
  });

  it('returns null for expired code', () => {
    const store = new CodeStore();

    store.store('expired-code', {
      codeChallenge: 'challenge',
      redirectUri: 'https://kotel.localhost/callback',
      state: 'state',
      userId: 'user-1',
      clientType: 'WEB',
    });

    vi.advanceTimersByTime(60_001);

    expect(store.consume('expired-code')).toBeNull();

    store.onModuleDestroy();
  });

  it('stores multiple codes and consumes each independently', () => {
    const store = new CodeStore();

    store.store('code-a', {
      codeChallenge: 'challenge-a',
      redirectUri: 'https://kotel.localhost/callback-a',
      state: 'state-a',
      userId: 'user-a',
      clientType: 'WEB',
    });
    store.store('code-b', {
      codeChallenge: 'challenge-b',
      redirectUri: 'exp://127.0.0.1:8081/--/callback',
      state: 'state-b',
      userId: 'user-b',
      clientType: 'EXPO',
    });

    expect(store.consume('code-a')).toMatchObject({
      userId: 'user-a',
      clientType: 'WEB',
    });
    expect(store.consume('code-b')).toMatchObject({
      userId: 'user-b',
      clientType: 'EXPO',
    });

    store.onModuleDestroy();
  });

  it('returns null for unknown code', () => {
    const store = new CodeStore();

    expect(store.consume('missing-code')).toBeNull();

    store.onModuleDestroy();
  });
});
