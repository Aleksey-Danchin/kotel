import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import {
  loginFormSchema,
  tokenExchangeSchema,
  type LoginFormDto,
  type TokenExchangeDto,
} from '@contracts/auth';
import { PrismaService } from '../prisma/prisma.service';
import { CodeStore } from './code-store';
import bcrypt from 'bcryptjs';
import {
  getAccessTokenCookieOptions,
  getAccessTokenTtlSeconds,
  getRefreshTokenCookieOptions,
  getRefreshTokenTtlSeconds,
} from '../shared/cookie.constants';
import { generateToken, hashToken } from '../shared/token.utils';
import { SessionService } from '../session/session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly sessionService: SessionService,
    private readonly codeStore: CodeStore,
  ) {}

  async login(body: unknown): Promise<{ redirect: string }> {
    const dto = this.parseLoginDto(body);

    const user = await this.prismaService.client.user.findUnique({
      where: { login: dto.login },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({ message: 'Invalid credentials' });
    }

    const code = randomBytes(32).toString('hex');
    const clientType = this.resolveClientType(dto.redirect_uri);

    this.codeStore.store(code, {
      codeChallenge: dto.code_challenge,
      redirectUri: dto.redirect_uri,
      state: dto.state,
      userId: user.id,
      clientType,
    });

    const redirect = this.buildRedirectUri(dto.redirect_uri, code, dto.state);
    return { redirect };
  }

  async exchangeCode(
    body: unknown,
    response: Response,
  ): Promise<
    | { sessionId: string }
    | { accessToken: string; refreshToken: string; sessionId: string }
  > {
    const dto = this.parseTokenExchangeDto(body);
    const storedEntry = this.codeStore.consume(dto.code);

    if (!storedEntry) {
      throw new BadRequestException({ message: 'Invalid or expired code' });
    }

    const computedCodeChallenge = createHash('sha256')
      .update(dto.codeVerifier)
      .digest('base64url');
    if (computedCodeChallenge !== storedEntry.codeChallenge) {
      throw new BadRequestException({ message: 'PKCE verification failed' });
    }

    const accessToken = generateToken();
    const refreshToken = generateToken();
    const accessTokenHash = hashToken(accessToken);
    const refreshTokenHash = hashToken(refreshToken);
    const sessionId = randomUUID();
    const now = Date.now();
    const accessTokenExpiresAt = new Date(
      now + getAccessTokenTtlSeconds() * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      now + getRefreshTokenTtlSeconds() * 1000,
    );
    const fingerprint = new URL(storedEntry.redirectUri).origin;

    await this.sessionService.createSession({
      userId: storedEntry.userId,
      clientType: storedEntry.clientType,
      fingerprint,
      sessionId,
      accessTokenHash,
      refreshTokenHash,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    });

    if (storedEntry.clientType === 'WEB') {
      response.cookie(
        'accessToken',
        accessToken,
        getAccessTokenCookieOptions(),
      );
      response.cookie(
        'refreshToken',
        refreshToken,
        getRefreshTokenCookieOptions(),
      );
      return { sessionId };
    }

    return { accessToken, refreshToken, sessionId };
  }

  private parseLoginDto(body: unknown): LoginFormDto {
    try {
      return loginFormSchema.parse(body);
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

  private parseTokenExchangeDto(body: unknown): TokenExchangeDto {
    try {
      return tokenExchangeSchema.parse(body);
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

  private resolveClientType(redirectUri: string): 'WEB' | 'EXPO' {
    return redirectUri.startsWith('https://') ? 'WEB' : 'EXPO';
  }

  private buildRedirectUri(
    baseRedirectUri: string,
    code: string,
    state: string,
  ): string {
    const redirectUrl = new URL(baseRedirectUri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state);
    return redirectUrl.toString();
  }
}
