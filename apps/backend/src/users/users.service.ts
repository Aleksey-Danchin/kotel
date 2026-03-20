import { Injectable } from '@nestjs/common';
import type { User } from '~prisma/client/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll(): Promise<Omit<User, 'login' | 'passwordHash'>[]> {
    return this.prismaService.client.user.findMany();
  }
}
