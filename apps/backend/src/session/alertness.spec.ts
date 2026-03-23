import { afterEach, describe, expect, it } from 'vitest';
import { getAlertMode } from './alertness';

describe('alertness', () => {
  const originalMode = process.env.REUSE_DETECTION_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.REUSE_DETECTION_MODE;
      return;
    }

    process.env.REUSE_DETECTION_MODE = originalMode;
  });

  it('returns default quarantine when env is not set', () => {
    delete process.env.REUSE_DETECTION_MODE;

    expect(getAlertMode()).toBe('quarantine');
  });

  it('returns configured mode for valid values', () => {
    process.env.REUSE_DETECTION_MODE = 'debug';
    expect(getAlertMode()).toBe('debug');
    process.env.REUSE_DETECTION_MODE = 'isolation';
    expect(getAlertMode()).toBe('isolation');
    process.env.REUSE_DETECTION_MODE = 'quarantine';
    expect(getAlertMode()).toBe('quarantine');
    process.env.REUSE_DETECTION_MODE = 'lockdown';
    expect(getAlertMode()).toBe('lockdown');
  });

  it('throws on invalid mode', () => {
    process.env.REUSE_DETECTION_MODE = 'invalid';

    expect(() => getAlertMode()).toThrowError(
      'Invalid REUSE_DETECTION_MODE: invalid',
    );
  });
});
