import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { CodeStore } from './code-store';

describe('AuthController', () => {
  let app: INestApplication;
  let codeStore: CodeStore;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    codeStore = moduleRef.get(CodeStore);
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
});
