import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { SetupService } from './setup.service';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('SetupService', () => {
  const userCount = vi.fn();
  const userCreate = vi.fn();
  const transaction = vi.fn();

  const prismaService = {
    client: {
      user: {
        count: userCount,
      },
      $transaction: transaction,
    },
  };

  let service: SetupService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SetupService(prismaService as never);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
  });

  it('returns available true when there are no users', async () => {
    userCount.mockResolvedValue(0);

    await expect(service.getStatus()).resolves.toEqual({ available: true });
  });

  it('returns available false when users already exist', async () => {
    userCount.mockResolvedValue(2);

    await expect(service.getStatus()).resolves.toEqual({ available: false });
  });

  it('creates ROOT user when init is called and there are no users', async () => {
    transaction.mockImplementation(async (callback) =>
      callback({
        user: {
          count: vi.fn().mockResolvedValue(0),
          create: userCreate.mockResolvedValue({
            id: 'user-1',
            login: 'root',
            fullname: 'Root User',
            role: 'ROOT',
          }),
        },
      }),
    );

    const result = await service.init({
      login: 'root',
      password: 'secret123',
      fullname: 'Root User',
    });

    expect(result).toEqual({
      id: 'user-1',
      login: 'root',
      fullname: 'Root User',
      role: 'ROOT',
    });
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'ROOT' }),
      }),
    );
  });

  it('throws 403 when setup init is called after initial user exists', async () => {
    transaction.mockImplementation(async (callback) =>
      callback({
        user: {
          count: vi.fn().mockResolvedValue(1),
          create: vi.fn(),
        },
      }),
    );

    await expect(
      service.init({
        login: 'root',
        password: 'secret123',
        fullname: 'Root User',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
