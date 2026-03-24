import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('SetupController integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  const originalRecommendedClientUrl = process.env.RECOMMENDED_CLIENT_URL;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', {
      exclude: [{ path: '.well-known/client', method: RequestMethod.GET }],
    });
    await app.init();

    prismaService = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany();
    await prismaService.client.user.deleteMany();
    process.env.RECOMMENDED_CLIENT_URL = 'https://kotel.localhost';
  });

  afterAll(async () => {
    await prismaService.client.session.deleteMany();
    await prismaService.client.user.deleteMany();
    if (originalRecommendedClientUrl === undefined) {
      delete process.env.RECOMMENDED_CLIENT_URL;
    } else {
      process.env.RECOMMENDED_CLIENT_URL = originalRecommendedClientUrl;
    }
    await app.close();
  });

  it('returns available true when no users exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/setup/status')
      .expect(200);

    expect(response.body).toEqual({ available: true });
  });

  it('creates ROOT user via setup init and returns safe user payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/setup/init')
      .send({
        login: 'root',
        password: 'secret',
        fullname: 'Root User',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        login: 'root',
        fullname: 'Root User',
        role: 'ROOT',
      }),
    );
    expect(response.body.passwordHash).toBeUndefined();

    const createdUser = await prismaService.client.user.findUnique({
      where: { login: 'root' },
      select: {
        id: true,
        role: true,
      },
    });
    expect(createdUser?.id).toBe(response.body.id);
    expect(createdUser?.role).toBe('ROOT');
  });

  it('blocks repeated setup init with 403 and status becomes unavailable', async () => {
    await request(app.getHttpServer())
      .post('/api/setup/init')
      .send({
        login: 'root',
        password: 'secret',
        fullname: 'Root User',
      })
      .expect(201);

    const repeatedInit = await request(app.getHttpServer())
      .post('/api/setup/init')
      .send({
        login: 'root-2',
        password: 'secret',
        fullname: 'Root User 2',
      })
      .expect(403);

    expect(repeatedInit.body).toEqual({
      message: 'Setup already completed',
    });

    const status = await request(app.getHttpServer())
      .get('/api/setup/status')
      .expect(200);
    expect(status.body).toEqual({ available: false });
  });

  it('keeps setup endpoints public without auth token', async () => {
    await request(app.getHttpServer()).get('/api/setup/status').expect(200);
    await request(app.getHttpServer())
      .post('/api/setup/init')
      .send({
        login: 'root',
        password: 'secret',
        fullname: 'Root User',
      })
      .expect(201);
  });

  it('returns recommended_client for .well-known route when env is set', async () => {
    process.env.RECOMMENDED_CLIENT_URL = 'https://kotel.localhost';

    const response = await request(app.getHttpServer())
      .get('/.well-known/client')
      .expect(200);

    expect(response.body).toEqual({
      recommended_client: 'https://kotel.localhost',
    });
  });

  it('returns 404 for .well-known route when env is missing', async () => {
    delete process.env.RECOMMENDED_CLIENT_URL;

    await request(app.getHttpServer()).get('/.well-known/client').expect(404);
  });
});
