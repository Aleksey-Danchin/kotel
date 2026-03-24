import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generateToken, hashToken } from './token.utils';

describe('token.utils', () => {
  it('generateToken returns a 64-char hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generateToken returns different tokens on subsequent calls', () => {
    const first = generateToken();
    const second = generateToken();
    expect(first).not.toBe(second);
  });

  it('hashToken returns deterministic SHA-256 digest', () => {
    const token = 'my-token';
    const expected = createHash('sha256').update(token).digest('hex');
    expect(hashToken(token)).toBe(expected);
    expect(hashToken(token)).toBe(expected);
  });

  it('hashToken output differs from raw token', () => {
    const token = 'plain-token';
    expect(hashToken(token)).not.toBe(token);
  });
});
