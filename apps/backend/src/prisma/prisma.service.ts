import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { getPrismaClient } from '~prisma/factory';
import type { PrismaClient } from '~prisma/client/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma = getPrismaClient();

  get client(): PrismaClient {
    return this.prisma;
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
