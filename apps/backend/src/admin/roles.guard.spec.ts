import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  function createContext(role?: 'USER' | 'ADMIN' | 'ROOT') {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    } as never;
  }

  it('grants access when no roles metadata is present', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);

    expect(guard.canActivate(createContext('USER'))).toBe(true);
  });

  it('grants access when ADMIN is among required roles and user is ADMIN', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['ADMIN', 'ROOT']);

    expect(guard.canActivate(createContext('ADMIN'))).toBe(true);
  });

  it('denies access when required roles are ADMIN/ROOT and user is USER', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['ADMIN', 'ROOT']);

    expect(guard.canActivate(createContext('USER'))).toBe(false);
  });

  it('denies ADMIN when ROOT is required', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['ROOT']);

    expect(guard.canActivate(createContext('ADMIN'))).toBe(false);
  });

  it('grants ROOT when ROOT is required', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['ROOT']);

    expect(guard.canActivate(createContext('ROOT'))).toBe(true);
  });

  it('throws UnauthorizedException when roles are required but user is missing', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});
