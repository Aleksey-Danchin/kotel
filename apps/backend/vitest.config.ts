import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '~prisma': resolve(__dirname, '../prisma'),
      '@contracts': resolve(__dirname, 'src/contracts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    passWithNoTests: true,
  },
});
