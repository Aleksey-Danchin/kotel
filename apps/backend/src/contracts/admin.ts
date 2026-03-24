import { z } from 'zod';

export const createUserSchema = z
  .object({
    login: z.string().trim().min(1),
    password: z.string().min(1),
    fullname: z.string().trim().min(1),
    role: z.enum(['USER', 'ADMIN']).default('USER'),
  })
  .strict();

export type CreateUserDto = z.infer<typeof createUserSchema>;

export const revokeSessionsSchema = z
  .object({
    userId: z.string().min(1),
    reason: z.string().optional(),
  })
  .strict();

export type RevokeSessionsDto = z.infer<typeof revokeSessionsSchema>;

export const ADMIN_API_PATHS = {
  users: '/api/admin/users',
  revokeSessions: '/api/admin/sessions/revoke',
} as const;
