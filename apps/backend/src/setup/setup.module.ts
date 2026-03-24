import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SetupController, WellKnownController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [PrismaModule],
  controllers: [SetupController, WellKnownController],
  providers: [SetupService],
})
export class SetupModule {}
