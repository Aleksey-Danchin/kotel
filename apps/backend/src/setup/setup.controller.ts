import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../session/public.decorator';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('status')
  getStatus(): Promise<{ available: boolean }> {
    return this.setupService.getStatus();
  }

  @Public()
  @Post('init')
  init(@Body() body: unknown): Promise<{
    id: string;
    login: string;
    fullname: string;
    role: 'ROOT';
  }> {
    return this.setupService.init(body);
  }
}

@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('client')
  getClient(): { recommended_client: string } {
    return this.setupService.getRecommendedClient();
  }
}
