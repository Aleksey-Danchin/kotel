import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Response } from 'express';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { User } from '~prisma/client/client';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { SessionUser } from './session-user.decorator';
import { SessionGuard } from './session.guard';
import type { SessionRequest } from './session-request';

@Controller('session-guard-spec')
class SessionGuardSpecController {
  @Get('strong-default')
  @UseGuards(SessionGuard)
  strongDefault(@SessionUser() sessionUser: User) {
    return { id: sessionUser.id, fullname: sessionUser.fullname };
  }

  @Get('strong-explicit')
  @UseGuards(new SessionGuard({ strong: true }))
  strongExplicit(@SessionUser() sessionUser: User) {
    return { id: sessionUser.id, fullname: sessionUser.fullname };
  }

  @Get('weak')
  @UseGuards(new SessionGuard({ strong: false }))
  weak(
    @SessionUser() sessionUser: User | null,
    @Res({ passthrough: true }) response: Response,
  ): void {
    response.json(
      sessionUser
        ? { id: sessionUser.id, fullname: sessionUser.fullname }
        : null,
    );
  }

  @Get('memoized')
  @UseGuards(new SessionGuard({ strong: false }))
  async memoized(@Req() request: SessionRequest) {
    const first = await request.getSessionUser?.();
    const second = await request.getSessionUser?.();

    return {
      first: first?.id ?? null,
      second: second?.id ?? null,
    };
  }

  @Get('without-guard')
  withoutGuard(@SessionUser() _sessionUser: User | null) {
    return { ok: true };
  }
}

describe('SessionGuard and SessionUser integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let user2Id: string;

  beforeAll(async () => {
    process.env.SESSION_COOKIE_DOMAIN = 'kotel.localhost';
    process.env.IDLE_TIMEOUT = '3600';

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SessionGuardSpecController],
    }).compile();

    app = testingModule.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prismaService = app.get(PrismaService);
    const user2 = await prismaService.client.user.findUniqueOrThrow({
      where: { login: 'user2' },
      select: { id: true },
    });
    user2Id = user2.id;
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany({
      where: { userId: user2Id },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const signinAndGetCookie = async (): Promise<string[]> => {
    const response = await request(app.getHttpServer())
      .post('/api/session/signin')
      .send({ login: 'user2', password: '123' })
      .expect(200);

    return response.headers['set-cookie'];
  };

  it('returns 401 in default strong mode without session cookie', async () => {
    await request(app.getHttpServer())
      .get('/api/session-guard-spec/strong-default')
      .expect(401);
  });

  it('returns 401 in explicit strong mode without session cookie', async () => {
    await request(app.getHttpServer())
      .get('/api/session-guard-spec/strong-explicit')
      .expect(401);
  });

  it('allows weak mode without cookie and returns null session user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/session-guard-spec/weak')
      .expect(200);

    expect(response.body).toBeNull();
  });

  it('resolves SessionUser in both strong modes with valid cookie', async () => {
    const signinCookie = await signinAndGetCookie();

    const strongDefaultResponse = await request(app.getHttpServer())
      .get('/api/session-guard-spec/strong-default')
      .set('Cookie', signinCookie)
      .expect(200);
    expect(strongDefaultResponse.body).toEqual({
      id: expect.any(String),
      fullname: 'User 2',
    });

    const strongExplicitResponse = await request(app.getHttpServer())
      .get('/api/session-guard-spec/strong-explicit')
      .set('Cookie', signinCookie)
      .expect(200);
    expect(strongExplicitResponse.body).toEqual({
      id: expect.any(String),
      fullname: 'User 2',
    });
  });

  it('memoizes getSessionUser and performs one session lookup per request', async () => {
    const signinCookie = await signinAndGetCookie();
    const findUniqueSpy = vi.spyOn(prismaService.client.session, 'findUnique');

    const response = await request(app.getHttpServer())
      .get('/api/session-guard-spec/memoized')
      .set('Cookie', signinCookie)
      .expect(200);

    expect(response.body).toEqual({
      first: expect.any(String),
      second: expect.any(String),
    });
    expect(response.body.first).toBe(response.body.second);
    expect(findUniqueSpy).toHaveBeenCalledTimes(1);

    findUniqueSpy.mockRestore();
  });

  it('clears stale cookie in weak mode and returns null', async () => {
    const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleSession = await prismaService.client.session.create({
      data: {
        userId: user2Id,
        lastUsedAt: staleDate,
      },
      select: { key: true },
    });

    const response = await request(app.getHttpServer())
      .get('/api/session-guard-spec/weak')
      .set('Cookie', [`session=${staleSession.key}`])
      .expect(200);

    expect(response.body).toBeNull();
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('session=');
  });

  it('throws UnauthorizedException when SessionUser is used without guard', async () => {
    await request(app.getHttpServer())
      .get('/api/session-guard-spec/without-guard')
      .expect(401);
  });
});
