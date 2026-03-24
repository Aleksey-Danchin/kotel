import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CodeStore } from './code-store';
import { RateLimiter } from './rate-limiter';

@Module({
  imports: [PrismaModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService, CodeStore, RateLimiter],
  exports: [CodeStore],
})
export class AuthModule {}
