import { describe, expect, it } from 'vitest';

import { createPrismaClient } from '~prisma/factory';

describe('vitest backend configuration', () => {
  it('resolves ~prisma alias in test runtime', () => {
    expect(createPrismaClient).toBeTypeOf('function');
  });
});
