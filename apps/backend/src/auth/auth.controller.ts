import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Controller, Get, Header, Post, Res, Body } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../session/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  login(@Body() body: unknown): Promise<{ redirect: string }> {
    return this.authService.login(body);
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
}
