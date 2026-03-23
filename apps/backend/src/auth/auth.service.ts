import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { loginFormSchema, type LoginFormDto } from '@contracts/auth';
import { PrismaService } from '../prisma/prisma.service';
import { CodeStore } from './code-store';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
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
