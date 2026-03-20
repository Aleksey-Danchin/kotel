import bcrypt from "bcryptjs";
import type { PrismaClient } from "../client/client";

const USERS_COUNT = 100;
const PASSWORD = "123";
const HASH_ROUNDS = 10;

export const seedUsers = async (prisma: PrismaClient): Promise<void> => {
  const passwordHash = await bcrypt.hash(PASSWORD, HASH_ROUNDS);

  await prisma.user.createMany({
    data: Array.from({ length: USERS_COUNT }, (_, index) => ({
      fullname: `User ${index + 1}`,
      login: `user${index + 1}`,
      passwordHash,
    })),
  });
};
