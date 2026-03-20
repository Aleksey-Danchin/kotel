import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Module({
  imports: [PrismaModule],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule implements OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly sessionService: SessionService) {}

  async onModuleInit(): Promise<void> {
    await this.sessionService.cleanupStaleSessions();
    this.cleanupInterval = setInterval(() => {
      void this.sessionService.cleanupStaleSessions();
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
