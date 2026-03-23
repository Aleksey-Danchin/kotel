import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { CodeStore } from './code-store';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'node:crypto';
import { hashToken } from '../shared/token.utils';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_PATH,
} from '../shared/cookie.constants';

describe('AuthController', () => {
  let app: INestApplication;
  let codeStore: CodeStore;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    codeStore = moduleRef.get(CodeStore);
    prismaService = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/auth/login returns login page html', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/login')
      .expect(200);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('<form id="login-form">');
    expect(response.text).toContain("fetch('/api/auth/login'");
  });

  it('POST /api/auth/login returns redirect and stores web code', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: 'user1',
        password: '123',
        redirect_uri: 'https://kotel.localhost/callback',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        state: 'abc123',
      })
      .expect(201);

    expect(response.body.redirect).toMatch(
      /^https:\/\/kotel\.localhost\/callback\?code=[a-f0-9]{64}&state=abc123$/,
    );

    const code = new URL(response.body.redirect).searchParams.get('code');
    expect(code).toBeTruthy();

    const entry = codeStore.consume(code!);
    expect(entry).toMatchObject({
      redirectUri: 'https://kotel.localhost/callback',
      state: 'abc123',
      clientType: 'WEB',
    });
  });

  it('POST /api/auth/login stores EXPO client type for non-https redirect', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: 'user1',
        password: '123',
        redirect_uri: 'exp://127.0.0.1:8081/--/callback',
        code_challenge: 'b'.repeat(43),
        code_challenge_method: 'S256',
        state: 'expo-state',
      })
      .expect(201);

    const code = new URL(response.body.redirect).searchParams.get('code');
    expect(code).toBeTruthy();

    const entry = codeStore.consume(code!);
    expect(entry?.clientType).toBe('EXPO');
  });

  it('POST /api/auth/login returns 401 for invalid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: 'user1',
        password: 'wrong-password',
        redirect_uri: 'https://kotel.localhost/callback',
        code_challenge: 'c'.repeat(43),
        code_challenge_method: 'S256',
        state: 'abc123',
      })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });

  it('POST /api/auth/login returns 400 for malformed request', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: '',
        password: '123',
        redirect_uri: 'not-a-url',
        code_challenge: 'short',
        code_challenge_method: 'plain',
        state: '',
      })
      .expect(400);
  });

  it('POST /api/auth/token creates WEB session, sets cookies and returns only sessionId', async () => {
    const codeVerifier = 'v'.repeat(43);
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: 'user1',
        password: '123',
        redirect_uri: 'https://kotel.localhost/callback',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: 'web-state',
      })
      .expect(201);
    const code = new URL(loginResponse.body.redirect).searchParams.get('code');
    expect(code).toBeTruthy();

    const response = await request(app.getHttpServer())
      .post('/api/auth/token')
      .send({
        code,
        codeVerifier,
      })
      .expect(201);

    expect(response.body).toEqual({
      sessionId: expect.any(String),
    });

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
          item.includes('HttpOnly') &&
          item.includes('Secure') &&
          item.includes('SameSite=None') &&
          item.includes(`Path=${ACCESS_TOKEN_PATH}`),
      ),
    ).toBe(true);
    expect(
      setCookieHeader.some(
        (item: string) =>
          item.startsWith(`${REFRESH_TOKEN_COOKIE}=`) &&
          item.includes('HttpOnly') &&
          item.includes('Secure') &&
          item.includes('SameSite=None') &&
          item.includes(`Path=${REFRESH_TOKEN_PATH}`),
      ),
    ).toBe(true);

    const accessToken = /accessToken=([^;]+)/.exec(
      setCookieHeader.find((item: string) =>
        item.startsWith(`${ACCESS_TOKEN_COOKIE}=`),
      ) ?? '',
    )?.[1];
    const refreshToken = /refreshToken=([^;]+)/.exec(
      setCookieHeader.find((item: string) =>
        item.startsWith(`${REFRESH_TOKEN_COOKIE}=`),
      ) ?? '',
    )?.[1];

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const session = await prismaService.client.session.findFirst({
      where: { sessionId: response.body.sessionId },
    });
    expect(session).toMatchObject({
      sessionId: response.body.sessionId,
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      status: 'ACTIVE',
      prevSessionId: null,
      accessTokenHash: hashToken(accessToken!),
      refreshTokenHash: hashToken(refreshToken!),
    });
  });

  it('POST /api/auth/token returns tokens in body for EXPO client', async () => {
    const codeVerifier = 'e'.repeat(43);
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: 'user1',
        password: '123',
        redirect_uri: 'exp://127.0.0.1:8081/--/callback',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: 'expo-token-state',
      })
      .expect(201);

    const code = new URL(loginResponse.body.redirect).searchParams.get('code');
    expect(code).toBeTruthy();

    const response = await request(app.getHttpServer())
      .post('/api/auth/token')
      .send({
        code,
        codeVerifier,
      })
      .expect(201);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      sessionId: expect.any(String),
    });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('POST /api/auth/token returns 400 when PKCE verification fails', async () => {
    const verifier = 'p'.repeat(43);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: 'user1',
        password: '123',
        redirect_uri: 'https://kotel.localhost/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: 'pkce-mismatch',
      })
      .expect(201);

    const code = new URL(loginResponse.body.redirect).searchParams.get('code');
    const response = await request(app.getHttpServer())
      .post('/api/auth/token')
      .send({
        code,
        codeVerifier: 'x'.repeat(43),
      })
      .expect(400);

    expect(response.body.message).toBe('PKCE verification failed');
  });

  it('POST /api/auth/token returns 400 for expired and reused code', async () => {
    const expiredCode = 'expired-code';
    (codeStore as any).entries.set(expiredCode, {
      codeChallenge: createHash('sha256')
        .update('z'.repeat(43))
        .digest('base64url'),
      redirectUri: 'https://kotel.localhost/callback',
      state: 'expired-state',
      userId: '00000000-0000-0000-0000-000000000001',
      clientType: 'WEB',
      createdAt: Date.now() - 61_000,
    });

    const expiredResponse = await request(app.getHttpServer())
      .post('/api/auth/token')
      .send({
        code: expiredCode,
        codeVerifier: 'z'.repeat(43),
      })
      .expect(400);
    expect(expiredResponse.body.message).toBe('Invalid or expired code');

    const verifier = 'r'.repeat(43);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        login: 'user1',
        password: '123',
        redirect_uri: 'https://kotel.localhost/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: 'reused-code',
      })
      .expect(201);
    const code = new URL(loginResponse.body.redirect).searchParams.get('code');

    await request(app.getHttpServer())
      .post('/api/auth/token')
      .send({
        code,
        codeVerifier: verifier,
      })
      .expect(201);

    const reusedResponse = await request(app.getHttpServer())
      .post('/api/auth/token')
      .send({
        code,
        codeVerifier: verifier,
      })
      .expect(400);
    expect(reusedResponse.body.message).toBe('Invalid or expired code');
  });
});
