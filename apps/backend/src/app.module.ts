import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { AdminModule } from './admin/admin.module';
import { SetupModule } from './setup/setup.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    SessionModule,
    AdminModule,
    SetupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
