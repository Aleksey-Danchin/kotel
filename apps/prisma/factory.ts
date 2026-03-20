import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./client/client";
import type { PrismaClient as PrismaClientType } from "./client/client";

export const PRISMA_BASE_OMIT = {
  user: {
    login: true,
    passwordHash: true,
  },
} as const;

let prismaSingleton: PrismaClientType | null = null;

export const createPrismaClient = (
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaClientType => {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    omit: PRISMA_BASE_OMIT,
  });
};

export const getPrismaClient = (): PrismaClientType => {
  if (!prismaSingleton) {
    prismaSingleton = createPrismaClient();
  }

  return prismaSingleton;
};
