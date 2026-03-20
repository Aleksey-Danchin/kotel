import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { PrismaService } from './prisma.service';

const mockPrismaClient = {
  $connect: jest.fn(async () => undefined),
  $disconnect: jest.fn(async () => undefined),
};

jest.mock('~prisma/factory', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

describe('PrismaModule integration', () => {
  let moduleRef: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prismaService = moduleRef.get(PrismaService);
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await moduleRef.close();
  });

  it('exposes PrismaService from AppModule imports', () => {
    expect(prismaService).toBeDefined();
    expect(prismaService.client).toBeDefined();
    expect(prismaService.client).toBe(mockPrismaClient);
  });

  it('uses prisma lifecycle hooks on module init/destroy', async () => {
    await prismaService.onModuleInit();
    await prismaService.onModuleDestroy();

    expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(2);
    expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
  });
});
