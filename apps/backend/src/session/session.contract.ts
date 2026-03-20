import { z } from 'zod';

export const signinSchema = z
  .object({
    login: z.string().trim().min(1),
    password: z.string().min(1),
  })
  .strict();

export type SigninDto = z.infer<typeof signinSchema>;
