import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
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
import { RateLimiter } from './rate-limiter';

describe('AuthController', () => {
  let app: INestApplication;
  let codeStore: CodeStore;
  let prismaService: PrismaService;
  let rateLimiter: RateLimiter;
  const previousRateLimitEnv = {
    RATE_LIMIT_WINDOW_SECONDS: process.env.RATE_LIMIT_WINDOW_SECONDS,
    RATE_LIMIT_IP_CAPTCHA_THRESHOLD:
      process.env.RATE_LIMIT_IP_CAPTCHA_THRESHOLD,
    RATE_LIMIT_IP_BLOCK_THRESHOLD: process.env.RATE_LIMIT_IP_BLOCK_THRESHOLD,
    RATE_LIMIT_USERNAME_BLOCK_THRESHOLD:
      process.env.RATE_LIMIT_USERNAME_BLOCK_THRESHOLD,
  };

  beforeAll(async () => {
    process.env.RATE_LIMIT_WINDOW_SECONDS = '900';
    process.env.RATE_LIMIT_IP_CAPTCHA_THRESHOLD = '4';
    process.env.RATE_LIMIT_IP_BLOCK_THRESHOLD = '7';
    process.env.RATE_LIMIT_USERNAME_BLOCK_THRESHOLD = '10';

    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.setGlobalPrefix('api');
    await app.init();
    codeStore = moduleRef.get(CodeStore);
    prismaService = moduleRef.get(PrismaService);
    rateLimiter = moduleRef.get(RateLimiter);
  });

  beforeEach(() => {
    rateLimiter.resetAll();
  });

  afterAll(async () => {
    await app.close();
    for (const [key, value] of Object.entries(previousRateLimitEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  function loginPayload(password: string, state = 'abc123') {
    return {
      login: 'user1',
      password,
      redirect_uri: 'https://kotel.localhost/callback',
      code_challenge: 'a'.repeat(43),
      code_challenge_method: 'S256',
      state,
    };
  }

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
      .send(loginPayload('123'))
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
      .set('X-Forwarded-For', '10.10.10.10')
      .send(loginPayload('wrong-password'))
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });

  it('POST /api/auth/login requires captcha with delay on the 4th failed attempt', async () => {
    const ip = '10.10.10.20';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send(loginPayload('wrong-password', `captcha-before-${attempt}`))
        .expect(401);
    }

    const startedAt = Date.now();
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send(loginPayload('wrong-password', 'captcha-target'))
      .expect(401);
    const elapsedMs = Date.now() - startedAt;

    expect(response.body.message).toBe('Invalid credentials');
    expect(response.body.captchaRequired).toBe(true);
    expect(elapsedMs).toBeGreaterThanOrEqual(4_500);
  }, 20_000);

  it('POST /api/auth/login blocks on the 7th failed attempt from same IP', async () => {
    const ip = '10.10.10.30';
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send(loginPayload('wrong-password', `ip-block-${attempt}`))
        .expect(401);
    }

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send(loginPayload('wrong-password', 'ip-block-7'))
      .expect(429);

    expect(response.body.message).toBe('Too many login attempts');
    expect(response.body.reason).toBe('ip_blocked');
    expect(response.body.retryAfter).toBeGreaterThan(0);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  }, 30_000);

  it('POST /api/auth/login blocks on the 10th failed attempt by username across IPs', async () => {
    for (let attempt = 1; attempt <= 9; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', `10.10.11.${attempt}`)
        .send(loginPayload('wrong-password', `username-block-${attempt}`))
        .expect(401);
    }

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.10.11.20')
      .send(loginPayload('wrong-password', 'username-block-10'))
      .expect(429);

    expect(response.body.reason).toBe('username_blocked');
  }, 30_000);

  it('POST /api/auth/login resets username counter after successful login', async () => {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', `10.10.12.${attempt}`)
        .send(loginPayload('wrong-password', `reset-before-${attempt}`))
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.10.12.100')
      .send(loginPayload('123', 'reset-success'))
      .expect(201);

    for (let attempt = 1; attempt <= 9; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', `10.10.13.${attempt}`)
        .send(loginPayload('wrong-password', `reset-after-${attempt}`))
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.10.13.200')
      .send(loginPayload('wrong-password', 'reset-after-10'))
      .expect(429);
  });

  it('POST /api/auth/login allows attempts again after block window expires', async () => {
    const ip = '10.10.10.40';
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send(loginPayload('wrong-password', `window-before-${attempt}`))
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send(loginPayload('wrong-password', 'window-blocked'))
      .expect(429);

    const nowSpy = vi.spyOn(Date, 'now');
    const initialNow = Date.now();
    nowSpy.mockReturnValue(initialNow + 15 * 60 * 1000 + 1_000);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send(loginPayload('wrong-password', 'window-allowed'))
      .expect(401);

    nowSpy.mockRestore();
  }, 30_000);

  it('POST /api/auth/login uses client IP from X-Forwarded-For when trust proxy is enabled', async () => {
    const forwardedIp = '203.0.113.77';
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', forwardedIp)
        .send(loginPayload('wrong-password', `xff-${attempt}`))
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(loginPayload('wrong-password', 'xff-localhost-attempt'))
      .expect(401);

    const blockedByForwardedIp = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Forwarded-For', forwardedIp)
      .send(loginPayload('wrong-password', 'xff-blocked'))
      .expect(429);

    expect(blockedByForwardedIp.body.reason).toBe('ip_blocked');
  }, 30_000);

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
