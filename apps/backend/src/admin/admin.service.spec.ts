import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import type { UserRole } from '~prisma/client/client';
import { AdminService } from './admin.service';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

type PrismaMock = {
  client: {
    user: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    session: {
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
};

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: PrismaMock;
  let sessionService: {
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prismaService = {
      client: {
        user: {
          create: vi.fn(),
          findUnique: vi.fn(),
          delete: vi.fn(),
        },
        session: {
          updateMany: vi.fn(),
        },
      },
    };
    sessionService = {
      revokeAllUserSessions: vi.fn(),
    };

    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    service = new AdminService(prismaService as never, sessionService as never);
  });

  it('allows ROOT to create ADMIN', async () => {
    prismaService.client.user.create.mockResolvedValue({
      id: '1',
      fullname: 'Admin',
      role: 'ADMIN',
    });

    const result = await service.createUser('ROOT', {
      login: 'admin',
      password: 'secret123',
      fullname: 'Admin',
      role: 'ADMIN',
    });

    expect(result.role).toBe('ADMIN');
    expect(prismaService.client.user.create).toHaveBeenCalledOnce();
  });

  it('allows ROOT to create USER', async () => {
    prismaService.client.user.create.mockResolvedValue({
      id: '2',
      fullname: 'User',
      role: 'USER',
    });

    const result = await service.createUser('ROOT', {
      login: 'user',
      password: 'secret123',
      fullname: 'User',
      role: 'USER',
    });

    expect(result.role).toBe('USER');
    expect(prismaService.client.user.create).toHaveBeenCalledOnce();
  });

  it('allows ADMIN to create USER', async () => {
    prismaService.client.user.create.mockResolvedValue({
      id: '3',
      fullname: 'Regular',
      role: 'USER',
    });

    const result = await service.createUser('ADMIN', {
      login: 'regular',
      password: 'secret123',
      fullname: 'Regular',
      role: 'USER',
    });

    expect(result.role).toBe('USER');
    expect(prismaService.client.user.create).toHaveBeenCalledOnce();
  });

  it('forbids ADMIN creating ADMIN', async () => {
    await expect(
      service.createUser('ADMIN', {
        login: 'other-admin',
        password: 'secret123',
        fullname: 'Other Admin',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects creating ROOT account at validation level', async () => {
    await expect(
      service.createUser('ROOT', {
        login: 'root2',
        password: 'secret123',
        fullname: 'Root Two',
        role: 'ROOT',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows ROOT to delete USER', async () => {
    prismaService.client.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'USER',
    } satisfies { id: string; role: UserRole });

    await service.deleteUser({ id: 'root-1', role: 'ROOT' }, 'user-1');

    expect(prismaService.client.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('forbids deleting ROOT', async () => {
    prismaService.client.user.findUnique.mockResolvedValue({
      id: 'root-2',
      role: 'ROOT',
    } satisfies { id: string; role: UserRole });

    await expect(
      service.deleteUser({ id: 'root-1', role: 'ROOT' }, 'root-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids deleting self', async () => {
    prismaService.client.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: 'ADMIN',
    } satisfies { id: string; role: UserRole });

    await expect(
      service.deleteUser({ id: 'admin-1', role: 'ADMIN' }, 'admin-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids ADMIN deleting ADMIN', async () => {
    prismaService.client.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      role: 'ADMIN',
    } satisfies { id: string; role: UserRole });

    await expect(
      service.deleteUser({ id: 'admin-1', role: 'ADMIN' }, 'admin-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes sessions and returns revoked count', async () => {
    prismaService.client.user.findUnique.mockResolvedValue({
      role: 'USER',
    } satisfies { role: UserRole });
    sessionService.revokeAllUserSessions.mockResolvedValue(3);
    prismaService.client.session.updateMany.mockResolvedValue({ count: 3 });

    const result = await service.revokeSessions('ADMIN', {
      userId: 'user-1',
      reason: 'manual check',
    });

    expect(result).toEqual({ revokedCount: 3 });
    expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith(
      'user-1',
      'MANUAL_REVOKE',
    );
    expect(prismaService.client.session.updateMany).toHaveBeenCalledOnce();
    expect(
      prismaService.client.session.updateMany.mock.calls[0][0],
    ).toMatchObject({
      where: {
        userId: 'user-1',
        noActiveReason: 'MANUAL_REVOKE',
      },
      data: { noActiveDescribe: 'manual check' },
    });
  });

  it('throws NotFound when target user is missing for delete', async () => {
    prismaService.client.user.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteUser({ id: 'root-1', role: 'ROOT' }, 'missing-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
