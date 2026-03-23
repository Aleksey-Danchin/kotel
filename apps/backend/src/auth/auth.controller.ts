import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Controller, Get, Header, Post, Res, Body } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('login')
  login(@Body() body: unknown): Promise<{ redirect: string }> {
    return this.authService.login(body);
  }
}
