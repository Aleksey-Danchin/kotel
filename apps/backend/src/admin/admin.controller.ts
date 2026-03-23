import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../session/session-request';
import { AdminService } from './admin.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users')
  @Roles('ADMIN', 'ROOT')
  createUser(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.adminService.createUser(request.user.role, body);
  }

  @Get('users')
  @Roles('ADMIN', 'ROOT')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Delete('users/:id')
  @Roles('ADMIN', 'ROOT')
  async deleteUser(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.adminService.deleteUser(
      { id: request.user.id, role: request.user.role },
      id,
    );
    return { ok: true };
  }

  @Post('sessions/revoke')
  @Roles('ADMIN', 'ROOT')
  revokeSessions(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.adminService.revokeSessions(request.user.role, body);
  }
}
