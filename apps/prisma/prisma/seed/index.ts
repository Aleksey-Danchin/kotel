import type { PrismaClient as PrismaClientType } from "../../client/client";
import { createPrismaClient } from "../../factory";
import { seedUsers } from "./users.seed";

type SeedTask = {
  name: string;
  run: (prisma: PrismaClientType) => Promise<void>;
};

const prisma = createPrismaClient();
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
