import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import type {
  ClientType,
  NoActiveReason,
  Session,
  SessionStatus,
  User,
} from '~prisma/client/client';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAccessTokenCookieOptions,
  getAccessTokenTtlSeconds,
  getRefreshTokenCookieOptions,
  getRefreshTokenTtlSeconds,
} from '../shared/cookie.constants';
import { generateToken, hashToken } from '../shared/token.utils';
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
type TokenSource = 'cookie' | 'bearer';

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

  async refreshSession(
    refreshToken: string,
    source: TokenSource,
    response: Response,
  ): Promise<
    | { sessionId: string }
    | { accessToken: string; refreshToken: string; sessionId: string }
  > {
    const refreshTokenHash = hashToken(refreshToken);
    const existingSession = await this.findByRefreshTokenHash(refreshTokenHash);
    if (!existingSession) {
      throw new UnauthorizedException();
    }

    this.verifyClientType(source, existingSession.clientType);

    const usedSession = await this.markAsUsed(refreshTokenHash);
    if (!usedSession) {
      throw new UnauthorizedException();
    }

    const accessToken = generateToken();
    const newRefreshToken = generateToken();
    const now = Date.now();
    const accessTokenExpiresAt = new Date(
      now + getAccessTokenTtlSeconds() * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      now + getRefreshTokenTtlSeconds() * 1000,
    );

    await this.createSession({
      userId: usedSession.userId,
      clientType: usedSession.clientType,
      fingerprint: usedSession.fingerprint,
      sessionId: usedSession.sessionId,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(newRefreshToken),
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      prevSessionId: usedSession.id,
    });

    if (usedSession.clientType === 'WEB') {
      response.cookie(
        ACCESS_TOKEN_COOKIE,
        accessToken,
        getAccessTokenCookieOptions(),
      );
      response.cookie(
        REFRESH_TOKEN_COOKIE,
        newRefreshToken,
        getRefreshTokenCookieOptions(),
      );
      return { sessionId: usedSession.sessionId };
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: usedSession.sessionId,
    };
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

  private verifyClientType(source: TokenSource, clientType: ClientType): void {
    if (clientType === 'WEB' && source !== 'cookie') {
      throw new UnauthorizedException();
    }
    if (clientType === 'EXPO' && source !== 'bearer') {
      throw new UnauthorizedException();
    }
  }
}
