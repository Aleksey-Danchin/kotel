import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { signinSchema } from './session.contract';
import { SessionService } from './session.service';

const SESSION_COOKIE_NAME = 'session';
const SESSION_COOKIE_PATH = '/api';

const getSessionCookieDomain = (): string =>
  process.env.SESSION_COOKIE_DOMAIN ?? 'kotel.localhost';

const getSessionCookieOptions = () => ({
  domain: getSessionCookieDomain(),
  httpOnly: true,
  path: SESSION_COOKIE_PATH,
  secure: true,
});

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('signin')
  @HttpCode(200)
  async signin(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = signinSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const result = await this.sessionService.signin(parsed.data);
    response.cookie(
      SESSION_COOKIE_NAME,
      result.sessionKey,
      getSessionCookieOptions(),
    );
    return result.user;
  }

  @Post('signout')
  @HttpCode(200)
  async signout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    await this.sessionService.signout(
      request.cookies?.[SESSION_COOKIE_NAME] as string | undefined,
    );

    response.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
    return { ok: true };
  }

  @Get('check')
  async check(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const result = await this.sessionService.check(
      request.cookies?.[SESSION_COOKIE_NAME] as string | undefined,
    );

    if (result.stale) {
      response.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
    }

    response.json(result.user);
  }
}
