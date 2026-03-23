import { Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionController } from './session.controller';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SessionController],
  providers: [
    SessionService,
    SessionGuard,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [SessionService],
})
export class SessionModule implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

  constructor(private readonly sessionService: SessionService) {}

  async onModuleInit(): Promise<void> {
    await this.sessionService.cleanupExpiredSessions();
    this.cleanupInterval = setInterval(async () => {
      await this.sessionService.cleanupExpiredSessions();
    }, SessionModule.CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
