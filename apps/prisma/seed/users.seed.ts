import bcrypt from "bcryptjs";
import { UserRole, type PrismaClient } from "../client/client";

const USERS_COUNT = 100;
const PASSWORD = "123";
const HASH_ROUNDS = 10;

export const seedUsers = async (prisma: PrismaClient): Promise<void> => {
  const passwordHash = await bcrypt.hash(PASSWORD, HASH_ROUNDS);

  await prisma.user.createMany({
    data: Array.from({ length: USERS_COUNT }, (_, index) => {
      const userNumber = index + 1;

      if (userNumber === 1) {
        return {
          fullname: "Root User",
          login: "user1",
          passwordHash,
          role: UserRole.ROOT,
        };
      }

      if (userNumber >= 2 && userNumber <= 4) {
        return {
          fullname: `Admin User ${userNumber}`,
          login: `user${userNumber}`,
          passwordHash,
          role: UserRole.ADMIN,
        };
      }

      return {
        fullname: `User ${userNumber}`,
        login: `user${userNumber}`,
        passwordHash,
        role: UserRole.USER,
      };
    }),
  });
};
