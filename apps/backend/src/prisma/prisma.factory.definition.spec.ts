import { readFileSync } from 'fs';
import { join } from 'path';

describe('Shared Prisma factory definition', () => {
  it('configures PrismaPg adapter in shared factory', () => {
    const factorySource = readFileSync(
      join(__dirname, '..', '..', '..', 'prisma', 'factory.ts'),
      'utf8',
    );

    expect(factorySource).toContain('new PrismaPg({ connectionString })');
  });

  it('defines global omit for user login and passwordHash', () => {
    const factorySource = readFileSync(
      join(__dirname, '..', '..', '..', 'prisma', 'factory.ts'),
      'utf8',
    );

    expect(factorySource).toContain('login: true');
    expect(factorySource).toContain('passwordHash: true');
    expect(factorySource).toContain('omit: PRISMA_BASE_OMIT');
  });
});
