import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { User } from '~prisma/client/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SigninDto } from './session.contract';

export type SessionAuthResult = {
  sessionKey: string;
  user: User;
};

@Injectable()
export class SessionService {
  constructor(private readonly prismaService: PrismaService) {}

  async signin(dto: SigninDto): Promise<SessionAuthResult> {
    const credentials = await this.prismaService.client.user.findUnique({
      where: { login: dto.login },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!credentials) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      credentials.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.prismaService.client.session.create({
      data: {
        userId: credentials.id,
      },
    });

    const user = await this.prismaService.client.user.findUniqueOrThrow({
      where: { id: credentials.id },
    });

    return {
      sessionKey: session.key,
      user,
    };
  }

  async signout(sessionKey: string | undefined): Promise<void> {
    if (!sessionKey) {
      return;
    }

    await this.prismaService.client.session.deleteMany({
      where: { key: sessionKey },
    });
  }

  async check(sessionKey: string | undefined): Promise<User | null> {
    if (!sessionKey) {
      return null;
    }

    const session = await this.prismaService.client.session.findUnique({
      where: { key: sessionKey },
      include: { user: true },
    });

    return session?.user ?? null;
  }
}
