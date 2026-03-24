import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken } from '../shared/token.utils';

describe('SessionGuard integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prismaService = moduleRef.get(PrismaService);
    const user = await prismaService.client.user.findUnique({
      where: { login: 'user1' },
      select: { id: true },
    });
    if (!user) {
      throw new Error('Seed user user1 not found');
    }
    userId = user.id;
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for protected route without token', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('allows WEB session with valid access token cookie', async () => {
    const accessToken = `web-access-${randomUUID()}`;
    await createSession({
      userId,
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      accessToken,
    });

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Origin', 'https://kotel.localhost')
      .set('Cookie', [`accessToken=${accessToken}`])
      .expect(200);
  });

  it('allows EXPO session with valid bearer token', async () => {
    const accessToken = `expo-access-${randomUUID()}`;
    await createSession({
      userId,
      clientType: 'EXPO',
      fingerprint: 'exp://127.0.0.1:8081',
      accessToken,
    });

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Origin', 'exp://127.0.0.1:8081')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('keeps auth endpoints public without token', async () => {
    await request(app.getHttpServer()).get('/api/auth/login').expect(200);
  });

  async function createSession(params: {
    userId: string;
    clientType: 'WEB' | 'EXPO';
    fingerprint: string;
    accessToken: string;
  }): Promise<void> {
    const now = Date.now();
    await prismaService.client.session.create({
      data: {
        userId: params.userId,
        clientType: params.clientType,
        fingerprint: params.fingerprint,
        sessionId: randomUUID(),
        accessTokenHash: hashToken(params.accessToken),
        refreshTokenHash: hashToken(`refresh-${randomUUID()}`),
        accessTokenExpiresAt: new Date(now + 60_000),
        refreshTokenExpiresAt: new Date(now + 120_000),
      },
    });
  }
});
