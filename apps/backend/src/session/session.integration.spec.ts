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

  beforeAll(async () => {
    process.env.SESSION_COOKIE_DOMAIN = 'kotel.localhost';

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prismaService = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany();
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
});
