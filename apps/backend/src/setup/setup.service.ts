import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { setupInitSchema, type SetupInitDto } from '@contracts/setup';
import type { UserRole } from '~prisma/client/client';
import { PrismaService } from '../prisma/prisma.service';

type SetupStatusResponse = { available: boolean };
type SetupInitResponse = {
  id: string;
  login: string;
  fullname: string;
  role: UserRole;
};

@Injectable()
export class SetupService {
  constructor(private readonly prismaService: PrismaService) {}

  async getStatus(): Promise<SetupStatusResponse> {
    const usersCount = await this.prismaService.client.user.count();
    return { available: usersCount === 0 };
  }

  async init(body: unknown): Promise<SetupInitResponse> {
    const dto = this.parseSetupInitDto(body);
    return this.prismaService.client.$transaction(async (tx) => {
      const usersCount = await tx.user.count();
      if (usersCount > 0) {
        throw new ForbiddenException({ message: 'Setup already completed' });
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      return tx.user.create({
        data: {
          login: dto.login,
          fullname: dto.fullname,
          passwordHash,
          role: 'ROOT',
        },
        select: {
          id: true,
          login: true,
          fullname: true,
          role: true,
        },
      });
    });
  }

  getRecommendedClient(): { recommended_client: string } {
    const recommendedClient = process.env.RECOMMENDED_CLIENT_URL?.trim();
    if (!recommendedClient) {
      throw new NotFoundException();
    }
    return { recommended_client: recommendedClient };
  }

  private parseSetupInitDto(body: unknown): SetupInitDto {
    try {
      return setupInitSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.flatten(),
        });
      }
      throw error;
    }
  }
}
