import { z } from 'zod';

export const loginFormSchema = z
  .object({
    login: z.string().trim().min(1),
    password: z.string().min(1),
    redirect_uri: z.string().url(),
    code_challenge: z.string().min(43),
    code_challenge_method: z.literal('S256'),
    state: z.string().min(1),
  })
  .strict();

export type LoginFormDto = z.infer<typeof loginFormSchema>;

export const tokenExchangeSchema = z
  .object({
    code: z.string().min(1),
    codeVerifier: z.string().min(43),
  })
  .strict();

export type TokenExchangeDto = z.infer<typeof tokenExchangeSchema>;

export const AUTH_API_PATHS = {
  login: '/api/auth/login',
  token: '/api/auth/token',
} as const;
