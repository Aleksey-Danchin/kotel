import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { logoutSchema, type LogoutDto } from '@contracts/session';
import { ZodError } from 'zod';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '../shared/cookie.constants';
import { Public } from './public.decorator';
import type { AuthenticatedRequest } from './session-request';
import { SessionService } from './session.service';

type TokenSource = 'cookie' | 'bearer';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('status')
  getStatus(@Req() request: AuthenticatedRequest): {
    sessionId: string;
    user: { id: string; fullname: string; role: string };
  } {
    return {
      sessionId: request.session.sessionId,
      user: {
        id: request.user.id,
        fullname: request.user.fullname,
        role: request.user.role,
      },
    };
  }

  @Public()
  @Post('refresh')
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<
    | { sessionId: string }
    | { accessToken: string; refreshToken: string; sessionId: string }
  > {
    const { token, source } = this.extractRefreshToken(request);
    return this.sessionService.refreshSession(token, source, response);
  }

  @Post('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() body: unknown,
  ): Promise<{ ok: true }> {
    const dto = this.parseLogoutDto(body);
    if (dto.allDevices) {
      await this.sessionService.revokeAllUserSessions(
        request.user.id,
        'LOGOUT_ALL',
      );
    } else {
      await this.sessionService.revokeSession(
        request.session.id,
        'LOGOUT_CURRENT',
      );
    }

    if (request.session.clientType === 'WEB') {
      response.clearCookie(
        ACCESS_TOKEN_COOKIE,
        this.toClearCookieOptions(getAccessTokenCookieOptions()),
      );
      response.clearCookie(
        REFRESH_TOKEN_COOKIE,
        this.toClearCookieOptions(getRefreshTokenCookieOptions()),
      );
    }

    return { ok: true };
  }

  private extractRefreshToken(request: Request): {
    token: string;
    source: TokenSource;
  } {
    const cookieToken =
      typeof request.cookies?.refreshToken === 'string'
        ? request.cookies.refreshToken
        : null;
    if (cookieToken) {
      return { token: cookieToken, source: 'cookie' };
    }

    const bearerToken = this.extractBearerToken(request.headers.authorization);
    if (bearerToken) {
      return { token: bearerToken, source: 'bearer' };
    }

    throw new UnauthorizedException();
  }

  private extractBearerToken(
    authorization: string | string[] | undefined,
  ): string | null {
    const header = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    const trimmed = token.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseLogoutDto(body: unknown): LogoutDto {
    try {
      return logoutSchema.parse(body);
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

  private toClearCookieOptions(options: {
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'none';
  }): {
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'none';
  } {
    return {
      domain: options.domain,
      path: options.path,
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
    };
  }
}
