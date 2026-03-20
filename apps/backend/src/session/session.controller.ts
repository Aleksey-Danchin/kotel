import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { User } from '~prisma/client/client';
import { SessionUser } from './session-user.decorator';
import { signinSchema } from './session.contract';
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from './session.constants';
import { SessionGuard, SessionGuardConfig } from './session.guard';
import { SessionService } from './session.service';

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
  @UseGuards(SessionGuard)
  @SessionGuardConfig({ strong: false })
  check(
    @SessionUser() sessionUser: User | null,
    @Res({ passthrough: true }) response: Response,
  ): void {
    response.json(sessionUser);
  }
}
