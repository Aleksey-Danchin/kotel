import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../client/client";
import type { PrismaClient as PrismaClientType } from "../../client/client";
import { seedUsers } from "./users.seed";

type SeedTask = {
  name: string;
  run: (prisma: PrismaClientType) => Promise<void>;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const tasks: SeedTask[] = [{ name: "users", run: seedUsers }];

const run = async (): Promise<void> => {
  for (const task of tasks) {
    await task.run(prisma);
    console.info(`[seed] ${task.name} completed`);
  }
};

run()
  .catch((error: unknown) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
