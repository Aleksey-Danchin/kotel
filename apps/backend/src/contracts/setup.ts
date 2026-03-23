import { z } from 'zod';

export const setupInitSchema = z
  .object({
    login: z.string().trim().min(1),
    password: z.string().min(1),
    fullname: z.string().trim().min(1),
  })
  .strict();

export type SetupInitDto = z.infer<typeof setupInitSchema>;

export const SETUP_API_PATHS = {
  status: '/api/setup/status',
  init: '/api/setup/init',
} as const;
