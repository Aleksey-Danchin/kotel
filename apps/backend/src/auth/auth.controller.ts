import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../session/public.decorator';
import { AuthService } from './auth.service';
import { RateLimiter } from './rate-limiter';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimiter: RateLimiter,
  ) {}

  @Public()
  @Get('login')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async getLoginPage(@Res() response: Response): Promise<void> {
    const loginPagePath = join(
      process.cwd(),
      'src',
      'auth',
      'login-page',
      'login.html',
    );
    const html = await readFile(loginPagePath, 'utf-8');
    response.send(html);
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<
    { redirect: string } | { message: string; captchaRequired: true }
  > {
    const ip = this.extractIp(request);
    const username = this.extractUsername(body);
    const beforeAttempt = this.rateLimiter.checkLimits(ip, username);

    if (!beforeAttempt.allowed) {
      const retryAfterSeconds = beforeAttempt.retryAfterSeconds ?? 1;
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        {
          message: 'Too many login attempts',
          retryAfter: retryAfterSeconds,
          reason: beforeAttempt.reason,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (beforeAttempt.delayMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, beforeAttempt.delayMs),
      );
    }

    try {
      const result = await this.authService.login(body);
      this.rateLimiter.resetUsername(username);
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.rateLimiter.recordFailedAttempt(ip, username);
        if (beforeAttempt.captchaRequired) {
          throw new UnauthorizedException({
            message: 'Invalid credentials',
            captchaRequired: true,
          });
        }
      }

      throw error;
    }
  }

  @Public()
  @Post('token')
  exchangeCode(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<
    | { sessionId: string }
    | { accessToken: string; refreshToken: string; sessionId: string }
  > {
    return this.authService.exchangeCode(body, response);
  }

  private extractIp(request: Request): string {
    const rawForwardedFor = request.headers['x-forwarded-for'];
    const forwardedFor = Array.isArray(rawForwardedFor)
      ? rawForwardedFor[0]
      : rawForwardedFor;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }

  private extractUsername(body: unknown): string {
    if (
      body &&
      typeof body === 'object' &&
      'login' in body &&
      typeof body.login === 'string'
    ) {
      return body.login;
    }
    return '<invalid-login>';
  }
}
