import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';

const users = Array.from({ length: 100 }, (_, index) => ({
  id: `user-${index + 1}`,
  fullname: `User ${index + 1}`,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

const mockPrismaClient = {
  $connect: jest.fn(async () => undefined),
  $disconnect: jest.fn(async () => undefined),
  user: {
    findMany: jest.fn(async () => users),
  },
};

jest.mock('~prisma/factory', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

describe('Users endpoint integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/users returns all seeded users without sensitive fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users')
      .expect(200);
    const responseUsers = response.body as Array<Record<string, unknown>>;

    expect(Array.isArray(responseUsers)).toBe(true);
    expect(responseUsers).toHaveLength(100);
    expect(mockPrismaClient.user.findMany).toHaveBeenCalledTimes(1);

    for (const user of responseUsers) {
      expect(user).not.toHaveProperty('login');
      expect(user).not.toHaveProperty('passwordHash');
    }
  });
});
