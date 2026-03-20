import bcrypt from "bcryptjs";
import type { PrismaClient } from "../../client/client";

const USERS_COUNT = 100;
const PASSWORD = "123";
const HASH_ROUNDS = 10;

export const seedUsers = async (prisma: PrismaClient): Promise<void> => {
  const passwordHash = await bcrypt.hash(PASSWORD, HASH_ROUNDS);

  for (let index = 1; index <= USERS_COUNT; index += 1) {
    const fullname = `User ${index}`;
    const login = `user${index}`;

    await prisma.user.upsert({
      where: { login },
      update: { fullname, passwordHash },
      create: { fullname, login, passwordHash },
    });
  }
};
