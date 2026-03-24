import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_PATH,
} from '../shared/cookie.constants';
import { hashToken } from '../shared/token.utils';

describe('SessionController refresh integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userId: string;
  const testLogin = `refresh-spec-${randomUUID()}`;
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
    const user = await prismaService.client.user.create({
      data: {
        fullname: 'Refresh Spec User',
        login: testLogin,
        passwordHash: 'hash',
        role: 'USER',
      },
      select: { id: true },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany({ where: { userId } });
    process.env.REUSE_DETECTION_MODE = 'quarantine';
  });

  afterAll(async () => {
    await prismaService.client.session.deleteMany({ where: { userId } });
    await prismaService.client.user.deleteMany({ where: { id: userId } });
    if (originalReuseDetectionMode === undefined) {
      delete process.env.REUSE_DETECTION_MODE;
    } else {
      process.env.REUSE_DETECTION_MODE = originalReuseDetectionMode;
    }
    await app.close();
  });

  it('rotates WEB refresh token and sets new cookies', async () => {
    const refreshToken = `refresh-${randomUUID()}`;
    const oldSession = await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });

    const response = await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(201);

    expect(response.body).toEqual({ sessionId: oldSession.sessionId });
    const setCookieHeader = response.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(
      setCookieHeader.some((item: string) =>
        item.startsWith(`${ACCESS_TOKEN_COOKIE}=`),
      ),
    ).toBe(true);
    expect(
      setCookieHeader.some((item: string) =>
        item.startsWith(`${REFRESH_TOKEN_COOKIE}=`),
      ),
    ).toBe(true);
    expect(
      setCookieHeader.some(
        (item: string) =>
          item.startsWith(`${ACCESS_TOKEN_COOKIE}=`) &&
          item.includes(`Path=${ACCESS_TOKEN_PATH}`),
      ),
    ).toBe(true);
    expect(
      setCookieHeader.some(
        (item: string) =>
          item.startsWith(`${REFRESH_TOKEN_COOKIE}=`) &&
          item.includes(`Path=${REFRESH_TOKEN_PATH}`),
      ),
    ).toBe(true);

    const newRefreshToken = extractCookieValue(
      setCookieHeader,
      REFRESH_TOKEN_COOKIE,
    );
    expect(newRefreshToken).toBeTruthy();

    const usedSession = await prismaService.client.session.findUnique({
      where: { id: oldSession.id },
    });
    expect(usedSession?.status).toBe('USED');
    expect(usedSession?.refreshUsedAt).toBeTruthy();
    expect(usedSession?.noActiveAt).toBeTruthy();

    const rotatedSession = await prismaService.client.session.findUnique({
      where: { refreshTokenHash: hashToken(newRefreshToken!) },
    });
    expect(rotatedSession).toMatchObject({
      sessionId: oldSession.sessionId,
      prevSessionId: oldSession.id,
      status: 'ACTIVE',
      clientType: 'WEB',
      userId,
      fingerprint: 'https://kotel.localhost',
    });
  });

  it('returns session status for valid access token', async () => {
    const accessToken = `access-${randomUUID()}`;
    const session = await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      accessToken,
      refreshToken: `refresh-${randomUUID()}`,
    });

    const response = await request(app.getHttpServer())
      .get('/api/session/status')
      .set('Origin', 'https://kotel.localhost')
      .set('Cookie', [`${ACCESS_TOKEN_COOKIE}=${accessToken}`])
      .expect(200);

    expect(response.body).toEqual({
      sessionId: session.sessionId,
      user: {
        id: userId,
        fullname: 'Refresh Spec User',
        role: 'USER',
      },
    });
  });

  it('returns 401 for status without token', async () => {
    await request(app.getHttpServer()).get('/api/session/status').expect(401);
  });

  it('logout current revokes current session and clears cookies', async () => {
    const accessToken = `access-${randomUUID()}`;
    const refreshToken = `refresh-${randomUUID()}`;
    const session = await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      accessToken,
      refreshToken,
    });

    const response = await request(app.getHttpServer())
      .post('/api/session/logout')
      .set('Origin', 'https://kotel.localhost')
      .set('Cookie', [
        `${ACCESS_TOKEN_COOKIE}=${accessToken}`,
        `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
      ])
      .send({ allDevices: false })
      .expect(201);

    expect(response.body).toEqual({ ok: true });
    const updated = await prismaService.client.session.findUnique({
      where: { id: session.id },
    });
    expect(updated?.status).toBe('REVOKED');
    expect(updated?.noActiveReason).toBe('LOGOUT_CURRENT');

    const setCookieHeader = response.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(
      setCookieHeader.some(
        (item: string) =>
          item.startsWith(`${ACCESS_TOKEN_COOKIE}=`) &&
          item.includes('Expires=Thu, 01 Jan 1970'),
      ),
    ).toBe(true);
    expect(
      setCookieHeader.some(
        (item: string) =>
          item.startsWith(`${REFRESH_TOKEN_COOKIE}=`) &&
          item.includes('Expires=Thu, 01 Jan 1970'),
      ),
    ).toBe(true);
  });

  it('old access token returns 401 after current logout', async () => {
    const accessToken = `access-${randomUUID()}`;
    const refreshToken = `refresh-${randomUUID()}`;
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      accessToken,
      refreshToken,
    });

    await request(app.getHttpServer())
      .post('/api/session/logout')
      .set('Origin', 'https://kotel.localhost')
      .set('Cookie', [
        `${ACCESS_TOKEN_COOKIE}=${accessToken}`,
        `${REFRESH_TOKEN_COOKIE}=${refreshToken}`,
      ])
      .send({ allDevices: false })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/session/status')
      .set('Origin', 'https://kotel.localhost')
      .set('Cookie', [`${ACCESS_TOKEN_COOKIE}=${accessToken}`])
      .expect(401);
  });

  it('logout all devices revokes every active user session', async () => {
    const origin = 'https://kotel.localhost';
    const callerAccessToken = `access-${randomUUID()}`;
    const callerRefreshToken = `refresh-${randomUUID()}`;
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: origin,
      accessToken: callerAccessToken,
      refreshToken: callerRefreshToken,
    });
    const secondSession = await createActiveSession({
      clientType: 'WEB',
      fingerprint: origin,
      accessToken: `access-${randomUUID()}`,
      refreshToken: `refresh-${randomUUID()}`,
    });

    const response = await request(app.getHttpServer())
      .post('/api/session/logout')
      .set('Origin', origin)
      .set('Cookie', [
        `${ACCESS_TOKEN_COOKIE}=${callerAccessToken}`,
        `${REFRESH_TOKEN_COOKIE}=${callerRefreshToken}`,
      ])
      .send({ allDevices: true })
      .expect(201);

    expect(response.body).toEqual({ ok: true });
    const activeSessions = await prismaService.client.session.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    expect(activeSessions).toHaveLength(0);

    const updatedSecond = await prismaService.client.session.findUnique({
      where: { id: secondSession.id },
    });
    expect(updatedSecond?.status).toBe('REVOKED');
    expect(updatedSecond?.noActiveReason).toBe('LOGOUT_ALL');
  });

  it('rotates EXPO refresh token and returns tokens in body', async () => {
    const refreshToken = `refresh-${randomUUID()}`;
    const oldSession = await createActiveSession({
      clientType: 'EXPO',
      fingerprint: 'exp://127.0.0.1:8081',
      refreshToken,
    });

    const response = await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(201);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      sessionId: oldSession.sessionId,
    });
    expect(response.headers['set-cookie']).toBeUndefined();

    const usedSession = await prismaService.client.session.findUnique({
      where: { id: oldSession.id },
    });
    expect(usedSession?.status).toBe('USED');

    const rotatedSession = await prismaService.client.session.findUnique({
      where: { refreshTokenHash: hashToken(response.body.refreshToken) },
    });
    expect(rotatedSession).toMatchObject({
      sessionId: oldSession.sessionId,
      prevSessionId: oldSession.id,
      status: 'ACTIVE',
      clientType: 'EXPO',
      userId,
      fingerprint: 'exp://127.0.0.1:8081',
    });
  });

  it('returns 401 when refresh token is missing', async () => {
    await request(app.getHttpServer()).post('/api/session/refresh').expect(401);
  });

  it('returns 401 on channel mismatch', async () => {
    const refreshToken = `refresh-${randomUUID()}`;
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken: `refresh-${randomUUID()}`,
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);

    const sessions = await prismaService.client.session.findMany({
      where: { userId },
    });
    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.status === 'REVOKED')).toBe(
      true,
    );
    expect(
      sessions.every(
        (session) => session.noActiveReason === 'CHANNEL_MISMATCH',
      ),
    ).toBe(true);
  });

  it('returns 401 for already-used refresh token', async () => {
    const refreshToken = `refresh-${randomUUID()}`;
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(401);
  });

  it('returns 401 for unknown refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=refresh-${randomUUID()}`])
      .expect(401);
  });

  it('returns 401 for expired refresh token without triggering reuse response', async () => {
    const refreshToken = `refresh-${randomUUID()}`;
    const expiredSession = await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });
    await prismaService.client.session.update({
      where: { id: expiredSession.id },
      data: {
        status: 'EXPIRED',
        noActiveAt: new Date(),
        noActiveReason: 'EXPIRED',
      },
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(401);

    const sessions = await prismaService.client.session.findMany({
      where: { userId },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.status).toBe('EXPIRED');
  });

  it('returns 401 for revoked refresh token without triggering reuse response', async () => {
    const refreshToken = `refresh-${randomUUID()}`;
    const revokedSession = await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });
    await prismaService.client.session.update({
      where: { id: revokedSession.id },
      data: {
        status: 'REVOKED',
        noActiveAt: new Date(),
        noActiveReason: 'MANUAL_REVOKE',
      },
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(401);

    const sessions = await prismaService.client.session.findMany({
      where: { userId },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.status).toBe('REVOKED');
    expect(sessions[0]?.noActiveReason).toBe('MANUAL_REVOKE');
  });

  it('debug mode keeps user sessions untouched on reuse', async () => {
    process.env.REUSE_DETECTION_MODE = 'debug';
    const refreshToken = `refresh-${randomUUID()}`;
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(401);

    const sessions = await prismaService.client.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.status).toBe('USED');
    expect(sessions[1]?.status).toBe('ACTIVE');
  });

  it('isolation mode revokes only active chain sessions on reuse', async () => {
    process.env.REUSE_DETECTION_MODE = 'isolation';
    const refreshToken = `refresh-${randomUUID()}`;
    const chainSession = await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });
    const unrelatedSession = await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken: `refresh-${randomUUID()}`,
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(401);

    const chainRows = await prismaService.client.session.findMany({
      where: { userId, sessionId: chainSession.sessionId },
    });
    const unrelatedRow = await prismaService.client.session.findUnique({
      where: { id: unrelatedSession.id },
    });
    expect(chainRows.some((item) => item.status === 'REVOKED')).toBe(true);
    expect(unrelatedRow?.status).toBe('ACTIVE');
  });

  it('quarantine mode revokes all user sessions on reuse', async () => {
    process.env.REUSE_DETECTION_MODE = 'quarantine';
    const refreshToken = `refresh-${randomUUID()}`;
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken: `refresh-${randomUUID()}`,
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(401);

    const activeSessions = await prismaService.client.session.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    expect(activeSessions).toHaveLength(0);
  });

  it('lockdown mode revokes all user sessions with LOCKDOWN reason on reuse', async () => {
    process.env.REUSE_DETECTION_MODE = 'lockdown';
    const refreshToken = `refresh-${randomUUID()}`;
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken,
    });
    await createActiveSession({
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      refreshToken: `refresh-${randomUUID()}`,
    });

    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/session/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE}=${refreshToken}`])
      .expect(401);

    const activeSessions = await prismaService.client.session.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    expect(activeSessions).toHaveLength(0);

    const revokedSessions = await prismaService.client.session.findMany({
      where: { userId, status: 'REVOKED' },
    });
    expect(revokedSessions.length).toBeGreaterThan(0);
    expect(
      revokedSessions.every((session) => session.noActiveReason === 'LOCKDOWN'),
    ).toBe(true);
  });

  async function createActiveSession(params: {
    clientType: 'WEB' | 'EXPO';
    fingerprint: string;
    accessToken?: string;
    refreshToken: string;
  }) {
    const now = Date.now();
    return prismaService.client.session.create({
      data: {
        userId,
        clientType: params.clientType,
        fingerprint: params.fingerprint,
        sessionId: randomUUID(),
        accessTokenHash: hashToken(
          params.accessToken ?? `access-${randomUUID()}`,
        ),
        refreshTokenHash: hashToken(params.refreshToken),
        accessTokenExpiresAt: new Date(now + 60_000),
        refreshTokenExpiresAt: new Date(now + 120_000),
      },
    });
  }

  function extractCookieValue(
    setCookieHeader: string[],
    cookieName: string,
  ): string | null {
    const cookieLine = setCookieHeader.find((item) =>
      item.startsWith(`${cookieName}=`),
    );
    if (!cookieLine) {
      return null;
    }

    const value = new RegExp(`${cookieName}=([^;]+)`).exec(cookieLine)?.[1];
    return value ?? null;
  }
});
