import { Injectable } from '@nestjs/common';
import type {
  ClientType,
  NoActiveReason,
  Session,
  SessionStatus,
  User,
} from '~prisma/client/client';
import { PrismaService } from '../prisma/prisma.service';

type SessionWithUser = Session & { user: User };

type CreateSessionParams = {
  userId: string;
  clientType: ClientType;
  fingerprint: string;
  sessionId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  prevSessionId?: string;
};

type MarkAsUsedResult = {
  id: string;
  sessionId: string;
  userId: string;
  clientType: ClientType;
  fingerprint: string;
};

@Injectable()
export class SessionService {
  constructor(private readonly prismaService: PrismaService) {}

  async findByAccessTokenHash(hash: string): Promise<SessionWithUser | null> {
    return this.prismaService.client.session.findUnique({
      where: { accessTokenHash: hash },
      include: { user: true },
    });
  }

  async createSession(params: CreateSessionParams): Promise<Session> {
    return this.prismaService.client.session.create({
      data: {
        userId: params.userId,
        clientType: params.clientType,
        fingerprint: params.fingerprint,
        sessionId: params.sessionId,
        accessTokenHash: params.accessTokenHash,
        refreshTokenHash: params.refreshTokenHash,
        accessTokenExpiresAt: params.accessTokenExpiresAt,
        refreshTokenExpiresAt: params.refreshTokenExpiresAt,
        prevSessionId: params.prevSessionId ?? null,
      },
    });
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return this.prismaService.client.session.findUnique({
      where: { refreshTokenHash: hash },
    });
  }

  async markAsUsed(refreshTokenHash: string): Promise<MarkAsUsedResult | null> {
    const rows = await this.prismaService.client.$queryRaw<MarkAsUsedResult[]>`
      UPDATE "Session"
      SET
        status = 'USED'::"SessionStatus",
        "refreshUsedAt" = NOW(),
        "noActiveAt" = NOW()
      WHERE "refreshTokenHash" = ${refreshTokenHash}
        AND status = 'ACTIVE'::"SessionStatus"
      RETURNING id, "sessionId", "userId", "clientType", fingerprint
    `;

    return rows[0] ?? null;
  }

  async revokeChain(
    sessionId: string,
    userId: string,
    reason: NoActiveReason,
  ): Promise<number> {
    const result = await this.prismaService.client.session.updateMany({
      where: {
        sessionId,
        userId,
        status: 'ACTIVE' satisfies SessionStatus,
      },
      data: {
        status: 'REVOKED',
        noActiveAt: new Date(),
        noActiveReason: reason,
      },
    });

    return result.count;
  }

  async revokeAllUserSessions(
    userId: string,
    reason: NoActiveReason,
  ): Promise<number> {
    const result = await this.prismaService.client.session.updateMany({
      where: {
        userId,
        status: 'ACTIVE' satisfies SessionStatus,
      },
      data: {
        status: 'REVOKED',
        noActiveAt: new Date(),
        noActiveReason: reason,
      },
    });

    return result.count;
  }

  async revokeSession(id: string, reason: NoActiveReason): Promise<void> {
    await this.prismaService.client.session.update({
      where: { id },
      data: {
        status: 'REVOKED',
        noActiveAt: new Date(),
        noActiveReason: reason,
      },
    });
  }

  async markExpired(id: string, at: Date): Promise<void> {
    await this.prismaService.client.session.update({
      where: { id },
      data: {
        status: 'EXPIRED',
        noActiveAt: at,
        noActiveReason: 'EXPIRED',
      },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prismaService.client.session.updateMany({
      where: {
        status: 'ACTIVE' satisfies SessionStatus,
        refreshTokenExpiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
        noActiveAt: new Date(),
        noActiveReason: 'EXPIRED',
      },
    });

    return result.count;
  }
}
