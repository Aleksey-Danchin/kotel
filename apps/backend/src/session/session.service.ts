import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { User } from '~prisma/client/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SigninDto } from './session.contract';

export type SessionAuthResult = {
  sessionKey: string;
  user: User;
};

export type SessionCheckResult = {
  user: User | null;
  stale: boolean;
};

const ACTIVE_SESSION_LIMIT = 10;

@Injectable()
export class SessionService {
  private readonly idleTimeoutSeconds: number;

  constructor(private readonly prismaService: PrismaService) {
    this.idleTimeoutSeconds = this.readIdleTimeoutSeconds();
  }

  private readIdleTimeoutSeconds(): number {
    const value = process.env.IDLE_TIMEOUT;
    if (!value) {
      throw new Error('IDLE_TIMEOUT is required');
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('IDLE_TIMEOUT must be a positive number');
    }

    return parsed;
  }

  private getStaleCutoff(now: Date): Date {
    return new Date(now.getTime() - this.idleTimeoutSeconds * 1000);
  }

  private isStale(lastUsedAt: Date, now: Date): boolean {
    return lastUsedAt < this.getStaleCutoff(now);
  }

  async cleanupStaleSessions(userId?: string): Promise<number> {
    const deleteResult = await this.prismaService.client.session.deleteMany({
      where: {
        ...(userId ? { userId } : {}),
        lastUsedAt: { lt: this.getStaleCutoff(new Date()) },
      },
    });

    return deleteResult.count;
  }

  async signin(dto: SigninDto): Promise<SessionAuthResult> {
    const credentials = await this.prismaService.client.user.findUnique({
      where: { login: dto.login },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!credentials) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      credentials.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    const staleCutoff = this.getStaleCutoff(now);

    const session = await this.prismaService.client.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: {
          userId: credentials.id,
          lastUsedAt: { lt: staleCutoff },
        },
      });

      const activeCount = await tx.session.count({
        where: {
          userId: credentials.id,
          lastUsedAt: { gte: staleCutoff },
        },
      });

      if (activeCount >= ACTIVE_SESSION_LIMIT) {
        const youngestActiveSession = await tx.session.findFirst({
          where: {
            userId: credentials.id,
            lastUsedAt: { gte: staleCutoff },
          },
          orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
          select: { key: true },
        });

        if (youngestActiveSession) {
          await tx.session.delete({
            where: { key: youngestActiveSession.key },
          });
        }
      }

      return tx.session.create({
        data: {
          userId: credentials.id,
          lastUsedAt: now,
        },
      });
    });

    const user = await this.prismaService.client.user.findUniqueOrThrow({
      where: { id: credentials.id },
    });

    return {
      sessionKey: session.key,
      user,
    };
  }

  async signout(sessionKey: string | undefined): Promise<void> {
    if (!sessionKey) {
      return;
    }

    await this.prismaService.client.session.deleteMany({
      where: { key: sessionKey },
    });
  }

  async check(sessionKey: string | undefined): Promise<SessionCheckResult> {
    if (!sessionKey) {
      return { user: null, stale: false };
    }

    const session = await this.prismaService.client.session.findUnique({
      where: { key: sessionKey },
      include: { user: true },
    });

    if (!session) {
      return { user: null, stale: false };
    }

    const now = new Date();
    if (this.isStale(session.lastUsedAt, now)) {
      await this.prismaService.client.session.deleteMany({
        where: { key: session.key },
      });

      return { user: null, stale: true };
    }

    await this.prismaService.client.session.updateMany({
      where: { key: session.key },
      data: { lastUsedAt: now },
    });

    return { user: session.user, stale: false };
  }
}
