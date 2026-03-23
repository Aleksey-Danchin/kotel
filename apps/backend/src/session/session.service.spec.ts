import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const mockPrismaService = {
    client: {
      session: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      $queryRaw: vi.fn(),
    },
  };

  let service: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionService(mockPrismaService as any);
  });

  it('findByAccessTokenHash returns session with user or null', async () => {
    const sessionWithUser = {
      id: 'session-1',
      accessTokenHash: 'access-hash',
      refreshTokenHash: 'refresh-hash',
      sessionId: 'chain-1',
      userId: 'user-1',
      clientType: 'WEB',
      status: 'ACTIVE',
      fingerprint: 'https://kotel.localhost',
      prevSessionId: null,
      accessTokenExpiresAt: new Date('2026-03-23T12:00:00.000Z'),
      refreshTokenExpiresAt: new Date('2026-03-23T13:00:00.000Z'),
      refreshUsedAt: null,
      noActiveAt: null,
      noActiveReason: null,
      noActiveDescribe: null,
      createdAt: new Date('2026-03-23T11:00:00.000Z'),
      user: {
        id: 'user-1',
        login: 'user1',
        passwordHash: 'hash',
        role: 'ADMIN',
        createdAt: new Date('2026-03-23T10:00:00.000Z'),
      },
    };
    mockPrismaService.client.session.findUnique
      .mockResolvedValueOnce(sessionWithUser)
      .mockResolvedValueOnce(null);

    await expect(service.findByAccessTokenHash('access-hash')).resolves.toEqual(
      sessionWithUser,
    );
    await expect(service.findByAccessTokenHash('missing')).resolves.toBeNull();
    expect(mockPrismaService.client.session.findUnique).toHaveBeenNthCalledWith(
      1,
      {
        where: { accessTokenHash: 'access-hash' },
        include: { user: true },
      },
    );
    expect(mockPrismaService.client.session.findUnique).toHaveBeenNthCalledWith(
      2,
      {
        where: { accessTokenHash: 'missing' },
        include: { user: true },
      },
    );
  });

  it('createSession creates a valid session record', async () => {
    const now = new Date('2026-03-23T12:00:00.000Z');
    const createdSession = {
      id: 'session-1',
      userId: 'user-1',
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
      sessionId: 'chain-1',
      accessTokenHash: 'access-hash',
      refreshTokenHash: 'refresh-hash',
      status: 'ACTIVE',
      prevSessionId: null,
      accessTokenExpiresAt: now,
      refreshTokenExpiresAt: now,
      refreshUsedAt: null,
      noActiveAt: null,
      noActiveReason: null,
      noActiveDescribe: null,
      createdAt: now,
    };
    mockPrismaService.client.session.create.mockResolvedValueOnce(createdSession);

    await expect(
      service.createSession({
        userId: 'user-1',
        clientType: 'WEB',
        fingerprint: 'https://kotel.localhost',
        sessionId: 'chain-1',
        accessTokenHash: 'access-hash',
        refreshTokenHash: 'refresh-hash',
        accessTokenExpiresAt: now,
        refreshTokenExpiresAt: now,
      }),
    ).resolves.toEqual(createdSession);

    expect(mockPrismaService.client.session.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        clientType: 'WEB',
        fingerprint: 'https://kotel.localhost',
        sessionId: 'chain-1',
        accessTokenHash: 'access-hash',
        refreshTokenHash: 'refresh-hash',
        accessTokenExpiresAt: now,
        refreshTokenExpiresAt: now,
        prevSessionId: null,
      },
    });
  });

  it('findByRefreshTokenHash returns session for valid hash', async () => {
    const session = { id: 'session-1' };
    mockPrismaService.client.session.findUnique
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(null);

    await expect(service.findByRefreshTokenHash('refresh-hash')).resolves.toEqual(
      session,
    );
    await expect(service.findByRefreshTokenHash('missing')).resolves.toBeNull();
    expect(mockPrismaService.client.session.findUnique).toHaveBeenNthCalledWith(
      1,
      { where: { refreshTokenHash: 'refresh-hash' } },
    );
    expect(mockPrismaService.client.session.findUnique).toHaveBeenNthCalledWith(
      2,
      { where: { refreshTokenHash: 'missing' } },
    );
  });

  it('markAsUsed atomically transitions ACTIVE to USED and returns null otherwise', async () => {
    const updated = {
      id: 'session-1',
      sessionId: 'chain-1',
      userId: 'user-1',
      clientType: 'WEB',
      fingerprint: 'https://kotel.localhost',
    };
    mockPrismaService.client.$queryRaw
      .mockResolvedValueOnce([updated])
      .mockResolvedValueOnce([]);

    await expect(service.markAsUsed('refresh-hash')).resolves.toEqual(updated);
    await expect(service.markAsUsed('used-hash')).resolves.toBeNull();
  });

  it('revokeChain revokes all ACTIVE sessions with matching sessionId', async () => {
    mockPrismaService.client.session.updateMany.mockResolvedValueOnce({
      count: 3,
    });

    await expect(
      service.revokeChain('chain-1', 'user-1', 'REUSE_DETECTED'),
    ).resolves.toBe(3);
    expect(mockPrismaService.client.session.updateMany).toHaveBeenCalledWith({
      where: {
        sessionId: 'chain-1',
        userId: 'user-1',
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        noActiveAt: expect.any(Date),
        noActiveReason: 'REUSE_DETECTED',
      },
    });
  });

  it('revokeAllUserSessions revokes all ACTIVE user sessions', async () => {
    mockPrismaService.client.session.updateMany.mockResolvedValueOnce({
      count: 2,
    });

    await expect(
      service.revokeAllUserSessions('user-1', 'LOGOUT_ALL'),
    ).resolves.toBe(2);
    expect(mockPrismaService.client.session.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        noActiveAt: expect.any(Date),
        noActiveReason: 'LOGOUT_ALL',
      },
    });
  });

  it('revokeSession revokes a single session by id', async () => {
    mockPrismaService.client.session.update.mockResolvedValueOnce({
      id: 'session-1',
    });

    await service.revokeSession('session-1', 'LOGOUT_CURRENT');
    expect(mockPrismaService.client.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        status: 'REVOKED',
        noActiveAt: expect.any(Date),
        noActiveReason: 'LOGOUT_CURRENT',
      },
    });
  });

  it('cleanupExpiredSessions marks expired active sessions', async () => {
    mockPrismaService.client.session.updateMany.mockResolvedValueOnce({
      count: 4,
    });

    await expect(service.cleanupExpiredSessions()).resolves.toBe(4);
    expect(mockPrismaService.client.session.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        refreshTokenExpiresAt: { lt: expect.any(Date) },
      },
      data: {
        status: 'EXPIRED',
        noActiveAt: expect.any(Date),
        noActiveReason: 'EXPIRED',
      },
    });
  });
});
