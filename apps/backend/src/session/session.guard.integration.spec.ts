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
  const originalReuseDetectionMode = process.env.REUSE_DETECTION_MODE;

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
    process.env.REUSE_DETECTION_MODE = 'quarantine';
  });

  afterAll(async () => {
    if (originalReuseDetectionMode === undefined) {
      delete process.env.REUSE_DETECTION_MODE;
    } else {
      process.env.REUSE_DETECTION_MODE = originalReuseDetectionMode;
    }
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

  it('returns 401 and revokes sessions on WEB bearer channel mismatch', async () => {
    const mismatchUser = await prismaService.client.user.create({
      data: {
        fullname: 'Mismatch Guard User',
        login: `guard-mismatch-${randomUUID()}`,
        passwordHash: 'hash',
        role: 'USER',
      },
      select: { id: true },
    });
    const accessToken = `web-access-${randomUUID()}`;
    const firstSession = await createSession({
      userId: mismatchUser.id,
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      accessToken,
    });
    await createSession({
      userId: mismatchUser.id,
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      accessToken: `web-access-${randomUUID()}`,
    });

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    const sessions = await prismaService.client.session.findMany({
      where: { userId: mismatchUser.id },
    });
    expect(sessions.every((session) => session.status === 'REVOKED')).toBe(
      true,
    );
    expect(
      sessions.every(
        (session) => session.noActiveReason === 'CHANNEL_MISMATCH',
      ),
    ).toBe(true);
    expect(sessions.some((session) => session.id === firstSession.id)).toBe(
      true,
    );
    await prismaService.client.session.deleteMany({
      where: { userId: mismatchUser.id },
    });
    await prismaService.client.user.delete({ where: { id: mismatchUser.id } });
  });

  async function createSession(params: {
    userId: string;
    clientType: 'WEB' | 'EXPO';
    fingerprint: string;
    accessToken: string;
  }) {
    const now = Date.now();
    return prismaService.client.session.create({
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
