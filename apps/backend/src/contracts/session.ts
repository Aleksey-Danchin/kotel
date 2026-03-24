import { z } from 'zod';

export const logoutSchema = z
  .object({
    allDevices: z.boolean().default(false),
  })
  .strict();

export type LogoutDto = z.infer<typeof logoutSchema>;

export const SESSION_API_PATHS = {
  status: '/api/session/status',
  refresh: '/api/session/refresh',
  logout: '/api/session/logout',
} as const;
