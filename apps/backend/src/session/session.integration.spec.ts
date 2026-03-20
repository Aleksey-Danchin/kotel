import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('SessionController integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let user1Id: string;

  beforeAll(async () => {
    process.env.SESSION_COOKIE_DOMAIN = 'kotel.localhost';
    process.env.IDLE_TIMEOUT = '3600';

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prismaService = app.get(PrismaService);
    const user1 = await prismaService.client.user.findUniqueOrThrow({
      where: { login: 'user1' },
      select: { id: true },
    });
    user1Id = user1.id;
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany({
      where: { userId: user1Id },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs in, checks session and signs out', async () => {
    const signinResponse = await request(app.getHttpServer())
      .post('/api/session/signin')
      .send({ login: 'user1', password: '123' })
      .expect(200);

    expect(signinResponse.body).toEqual({
      id: expect.any(String),
      fullname: 'User 1',
    });

    const signinCookie = signinResponse.headers['set-cookie'];
    expect(signinCookie).toBeDefined();
    expect(signinCookie[0]).toContain('session=');
    expect(signinCookie[0]).toContain('HttpOnly');
    expect(signinCookie[0]).toContain('Secure');
    expect(signinCookie[0]).toContain('Domain=kotel.localhost');
    expect(signinCookie[0]).toContain('Path=/api');
    expect(signinCookie[0]).not.toContain('Max-Age=');

    const checkResponse = await request(app.getHttpServer())
      .get('/api/session/check')
      .set('Cookie', signinCookie)
      .expect(200);

    expect(checkResponse.body).toEqual({
      id: expect.any(String),
      fullname: 'User 1',
    });

    const signoutResponse = await request(app.getHttpServer())
      .post('/api/session/signout')
      .set('Cookie', signinCookie)
      .expect(200);

    expect(signoutResponse.body).toEqual({ ok: true });

    const signoutCookie = signoutResponse.headers['set-cookie'];
    expect(signoutCookie).toBeDefined();
    expect(signoutCookie[0]).toContain('session=');
    expect(signoutCookie[0]).toContain('HttpOnly');
    expect(signoutCookie[0]).toContain('Secure');
    expect(signoutCookie[0]).toContain('Domain=kotel.localhost');
    expect(signoutCookie[0]).toContain('Path=/api');

    const checkAfterSignoutResponse = await request(app.getHttpServer())
      .get('/api/session/check')
      .set('Cookie', signinCookie)
      .expect(200);

    expect(checkAfterSignoutResponse.body).toBeNull();
  });

  it('returns 400 for malformed signin body', async () => {
    await request(app.getHttpServer())
      .post('/api/session/signin')
      .send({ login: '', password: 123 })
      .expect(400);
  });

  it('returns null for check without cookie', async () => {
    const checkResponse = await request(app.getHttpServer())
      .get('/api/session/check')
      .expect(200);

    expect(checkResponse.body).toBeNull();
  });

  it('updates session lastUsedAt on successful check', async () => {
    const signinResponse = await request(app.getHttpServer())
      .post('/api/session/signin')
      .send({ login: 'user1', password: '123' })
      .expect(200);

    const signinCookie = signinResponse.headers['set-cookie'];
    const sessionKey = signinCookie[0].match(/session=([^;]+)/)?.[1];
    expect(sessionKey).toBeDefined();

    const staleButActiveDate = new Date(Date.now() - 30 * 60 * 1000);
    await prismaService.client.session.update({
      where: { key: sessionKey },
      data: { lastUsedAt: staleButActiveDate },
    });

    const checkResponse = await request(app.getHttpServer())
      .get('/api/session/check')
      .set('Cookie', signinCookie)
      .expect(200);

    expect(checkResponse.body).toEqual({
      id: expect.any(String),
      fullname: 'User 1',
    });

    const sessionAfterCheck =
      await prismaService.client.session.findUniqueOrThrow({
        where: { key: sessionKey },
        select: { lastUsedAt: true },
      });
    expect(sessionAfterCheck.lastUsedAt.getTime()).toBeGreaterThan(
      staleButActiveDate.getTime(),
    );
  });

  it('deletes stale sessions and clears cookie on check', async () => {
    const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleSession = await prismaService.client.session.create({
      data: {
        userId: user1Id,
        lastUsedAt: staleDate,
      },
      select: { key: true },
    });

    const response = await request(app.getHttpServer())
      .get('/api/session/check')
      .set('Cookie', [`session=${staleSession.key}`])
      .expect(200);

    expect(response.body).toBeNull();
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('session=');

    const sessionAfterCheck = await prismaService.client.session.findUnique({
      where: { key: staleSession.key },
      select: { key: true },
    });
    expect(sessionAfterCheck).toBeNull();
  });

  it('deletes youngest active session on overflow when creating the 11th', async () => {
    const now = Date.now();
    const insertedSessions = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        prismaService.client.session.create({
          data: {
            userId: user1Id,
            lastUsedAt: new Date(now - (10 - index) * 60_000),
          },
          select: { key: true, lastUsedAt: true },
        }),
      ),
    );

    const youngestExisting = insertedSessions.reduce(
      (currentYoungest, session) =>
        session.lastUsedAt > currentYoungest.lastUsedAt
          ? session
          : currentYoungest,
    );

    const signinResponse = await request(app.getHttpServer())
      .post('/api/session/signin')
      .send({ login: 'user1', password: '123' })
      .expect(200);

    const newSessionKey =
      signinResponse.headers['set-cookie'][0].match(/session=([^;]+)/)?.[1];
    expect(newSessionKey).toBeDefined();

    const sessionsAfterOverflow = await prismaService.client.session.findMany({
      where: { userId: user1Id },
      select: { key: true },
    });

    expect(sessionsAfterOverflow).toHaveLength(10);
    expect(sessionsAfterOverflow.map((session) => session.key)).not.toContain(
      youngestExisting.key,
    );
    expect(sessionsAfterOverflow.map((session) => session.key)).toContain(
      newSessionKey as string,
    );
  });

  it('removes stale sessions before overflow policy', async () => {
    const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleSession = await prismaService.client.session.create({
      data: {
        userId: user1Id,
        lastUsedAt: staleDate,
      },
      select: { key: true },
    });

    const youngestActive = await prismaService.client.session.create({
      data: {
        userId: user1Id,
        lastUsedAt: new Date(Date.now() - 1_000),
      },
      select: { key: true },
    });

    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        prismaService.client.session.create({
          data: {
            userId: user1Id,
            lastUsedAt: new Date(Date.now() - (index + 2) * 60_000),
          },
        }),
      ),
    );

    await request(app.getHttpServer())
      .post('/api/session/signin')
      .send({ login: 'user1', password: '123' })
      .expect(200);

    const sessionsAfterSignin = await prismaService.client.session.findMany({
      where: { userId: user1Id },
      select: { key: true },
    });

    expect(sessionsAfterSignin).toHaveLength(10);
    expect(sessionsAfterSignin.map((session) => session.key)).not.toContain(
      staleSession.key,
    );
    expect(sessionsAfterSignin.map((session) => session.key)).toContain(
      youngestActive.key,
    );
  });
});
