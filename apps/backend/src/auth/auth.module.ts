import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CodeStore } from './code-store';

@Module({
  imports: [PrismaModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService, CodeStore],
  exports: [CodeStore],
})
export class AuthModule {}
