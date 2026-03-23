import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { UserRole } from '~prisma/client/client';
import type { CreateUserDto, RevokeSessionsDto } from '@contracts/admin';
import { createUserSchema, revokeSessionsSchema } from '@contracts/admin';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../session/session.service';

type SafeUser = {
  id: string;
  fullname: string;
  role: UserRole;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async createUser(actorRole: UserRole, body: unknown): Promise<SafeUser> {
    const dto = this.parseCreateUserDto(body);
    if (!this.canManageRole(actorRole, dto.role)) {
      throw new ForbiddenException();
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prismaService.client.user.create({
      data: {
        login: dto.login,
        fullname: dto.fullname,
        passwordHash,
        role: dto.role,
      },
      select: {
        id: true,
        fullname: true,
        role: true,
      },
    });
  }

  listUsers(): Promise<SafeUser[]> {
    return this.prismaService.client.user.findMany({
      select: {
        id: true,
        fullname: true,
        role: true,
      },
      orderBy: { fullname: 'asc' },
    });
  }

  async deleteUser(
    actor: { id: string; role: UserRole },
    userId: string,
  ): Promise<void> {
    const target = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) {
      throw new NotFoundException();
    }

    if (target.id === actor.id || target.role === 'ROOT') {
      throw new ForbiddenException();
    }

    if (!this.canDeleteRole(actor.role, target.role)) {
      throw new ForbiddenException();
    }

    await this.prismaService.client.user.delete({ where: { id: target.id } });
  }

  async revokeSessions(
    actorRole: UserRole,
    body: unknown,
  ): Promise<{ revokedCount: number }> {
    const dto = this.parseRevokeSessionsDto(body);
    const target = await this.prismaService.client.user.findUnique({
      where: { id: dto.userId },
      select: { role: true },
    });
    if (!target) {
      throw new NotFoundException();
    }

    if (!this.canRevokeSessions(actorRole, target.role)) {
      throw new ForbiddenException();
    }

    const revokedAfter = new Date();
    const revokedCount = await this.sessionService.revokeAllUserSessions(
      dto.userId,
      'MANUAL_REVOKE',
    );

    if (dto.reason && revokedCount > 0) {
      await this.prismaService.client.session.updateMany({
        where: {
          userId: dto.userId,
          noActiveReason: 'MANUAL_REVOKE',
          noActiveAt: { gte: revokedAfter },
        },
        data: { noActiveDescribe: dto.reason },
      });
    }

    return { revokedCount };
  }

  private parseCreateUserDto(body: unknown): CreateUserDto {
    try {
      return createUserSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.flatten(),
        });
      }
      throw error;
    }
  }

  private parseRevokeSessionsDto(body: unknown): RevokeSessionsDto {
    try {
      return revokeSessionsSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.flatten(),
        });
      }
      throw error;
    }
  }

  private canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
    if (targetRole === 'ROOT') {
      return false;
    }
    if (actorRole === 'ROOT') {
      return true;
    }
    return actorRole === 'ADMIN' && targetRole === 'USER';
  }

  private canDeleteRole(actorRole: UserRole, targetRole: UserRole): boolean {
    if (targetRole === 'ROOT') {
      return false;
    }
    if (actorRole === 'ROOT') {
      return true;
    }
    return actorRole === 'ADMIN' && targetRole === 'USER';
  }

  private canRevokeSessions(
    actorRole: UserRole,
    targetRole: UserRole,
  ): boolean {
    if (actorRole === 'ROOT') {
      return targetRole !== 'ROOT';
    }
    return actorRole === 'ADMIN' && targetRole === 'USER';
  }
}
