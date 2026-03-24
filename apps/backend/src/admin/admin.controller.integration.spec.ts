import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken } from '../shared/token.utils';

const ORIGIN = 'https://kotel.localhost';

describe('AdminController integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let rootUserId: string;
  let adminUserId: string;
  let regularUserId: string;
  const fixturesLoginPrefix = `step13-fixture-${randomUUID()}`;
  const createdLoginPrefix = `step13-created-${randomUUID()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prismaService = moduleRef.get(PrismaService);

    const fixturePasswordHash = await bcrypt.hash('123', 10);
    const rootUser = await prismaService.client.user.create({
      data: {
        fullname: 'Step13 Root',
        login: `${fixturesLoginPrefix}-root`,
        passwordHash: fixturePasswordHash,
        role: 'ROOT',
      },
      select: { id: true },
    });
    const adminUser = await prismaService.client.user.create({
      data: {
        fullname: 'Step13 Admin',
        login: `${fixturesLoginPrefix}-admin`,
        passwordHash: fixturePasswordHash,
        role: 'ADMIN',
      },
      select: { id: true },
    });
    const regularUser = await prismaService.client.user.create({
      data: {
        fullname: 'Step13 User',
        login: `${fixturesLoginPrefix}-user`,
        passwordHash: fixturePasswordHash,
        role: 'USER',
      },
      select: { id: true },
    });

    rootUserId = rootUser.id;
    adminUserId = adminUser.id;
    regularUserId = regularUser.id;
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany({
      where: { userId: { in: [rootUserId, adminUserId, regularUserId] } },
    });
    await prismaService.client.user.deleteMany({
      where: { login: { startsWith: createdLoginPrefix } },
    });
  });

  afterAll(async () => {
    await prismaService.client.session.deleteMany({
      where: { userId: { in: [rootUserId, adminUserId, regularUserId] } },
    });
    await prismaService.client.user.deleteMany({
      where: {
        OR: [
          { id: { in: [rootUserId, adminUserId, regularUserId] } },
          { login: { startsWith: createdLoginPrefix } },
        ],
      },
    });
    await app.close();
  });

  it('allows ROOT to create ADMIN and USER accounts', async () => {
    const rootHeaders = await authHeaders(rootUserId);

    const createAdminResponse = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set(rootHeaders)
      .send({
        login: `${createdLoginPrefix}-admin`,
        password: '123',
        fullname: 'Step13 Created Admin',
        role: 'ADMIN',
      })
      .expect(201);

    expect(createAdminResponse.body.role).toBe('ADMIN');
    expect(createAdminResponse.body.passwordHash).toBeUndefined();

    const createUserResponse = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set(rootHeaders)
      .send({
        login: `${createdLoginPrefix}-user`,
        password: '123',
        fullname: 'Step13 Created User',
        role: 'USER',
      })
      .expect(201);

    expect(createUserResponse.body.role).toBe('USER');
    expect(createUserResponse.body.passwordHash).toBeUndefined();
  });

  it('allows ADMIN to create USER only and forbids creating ADMIN', async () => {
    const adminHeaders = await authHeaders(adminUserId);

    await request(app.getHttpServer())
      .post('/api/admin/users')
      .set(adminHeaders)
      .send({
        login: `${createdLoginPrefix}-admin-success-user`,
        password: '123',
        fullname: 'Step13 Admin Creates User',
        role: 'USER',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/admin/users')
      .set(adminHeaders)
      .send({
        login: `${createdLoginPrefix}-admin-forbidden-admin`,
        password: '123',
        fullname: 'Step13 Admin Creates Admin',
        role: 'ADMIN',
      })
      .expect(403);
  });

  it('forbids regular USER from accessing admin endpoints', async () => {
    const userHeaders = await authHeaders(regularUserId);

    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set(userHeaders)
      .expect(403);
  });

  it('lists users with roles', async () => {
    const rootHeaders = await authHeaders(rootUserId);

    const response = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set(rootHeaders)
      .expect(200);

    const fixtureUsers = response.body.filter((item: { id: string }) =>
      [rootUserId, adminUserId, regularUserId].includes(item.id),
    );

    expect(fixtureUsers).toHaveLength(3);
    expect(fixtureUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: rootUserId, role: 'ROOT' }),
        expect.objectContaining({ id: adminUserId, role: 'ADMIN' }),
        expect.objectContaining({ id: regularUserId, role: 'USER' }),
      ]),
    );
  });

  it('forbids deleting ROOT and self', async () => {
    const adminHeaders = await authHeaders(adminUserId);

    await request(app.getHttpServer())
      .delete(`/api/admin/users/${rootUserId}`)
      .set(adminHeaders)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/admin/users/${adminUserId}`)
      .set(adminHeaders)
      .expect(403);
  });

  it('revokes user sessions and returns revokedCount', async () => {
    const adminHeaders = await authHeaders(adminUserId);
    await createActiveSession(regularUserId, `${randomUUID()}-1`);
    await createActiveSession(regularUserId, `${randomUUID()}-2`);

    const response = await request(app.getHttpServer())
      .post('/api/admin/sessions/revoke')
      .set(adminHeaders)
      .send({
        userId: regularUserId,
        reason: 'manual-check',
      })
      .expect(201);

    expect(response.body).toEqual({ revokedCount: 2 });

    const revoked = await prismaService.client.session.findMany({
      where: { userId: regularUserId, status: 'REVOKED' },
      select: { noActiveReason: true, noActiveDescribe: true },
    });
    expect(revoked).toHaveLength(2);
    expect(
      revoked.every(
        (item) =>
          item.noActiveReason === 'MANUAL_REVOKE' &&
          item.noActiveDescribe === 'manual-check',
      ),
    ).toBe(true);
  });

  async function authHeaders(userId: string): Promise<Record<string, string>> {
    const accessToken = `access-${randomUUID()}`;
    await createActiveSession(userId, accessToken);

    return {
      Origin: ORIGIN,
      Cookie: `accessToken=${accessToken}`,
    };
  }

  async function createActiveSession(
    userId: string,
    accessToken: string,
  ): Promise<void> {
    const now = Date.now();
    await prismaService.client.session.create({
      data: {
        userId,
        clientType: 'WEB',
        fingerprint: ORIGIN,
        sessionId: randomUUID(),
        accessTokenHash: hashToken(accessToken),
        refreshTokenHash: hashToken(`refresh-${randomUUID()}`),
        accessTokenExpiresAt: new Date(now + 60_000),
        refreshTokenExpiresAt: new Date(now + 120_000),
      },
    });
  }
});
