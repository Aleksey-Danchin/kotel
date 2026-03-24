# Step 04: Token utilities, cookie constants, and Zod contracts

## Goal
Create foundational utility functions and constants used by both the Auth and Session modules: token generation, token hashing, cookie configuration, and Zod validation schemas.

## Motivation
These utilities are shared across multiple modules (Auth creates sessions, Session guard validates tokens, refresh rotates tokens). Extracting them into a shared location avoids duplication and ensures consistency.

## Type
backend, feature

## Affected Area
- `apps/backend/src/shared/token.utils.ts` — new file
- `apps/backend/src/shared/cookie.constants.ts` — new file
- `apps/backend/src/contracts/auth.ts` — new file (Zod schemas + API paths)
- `apps/backend/src/contracts/session.ts` — new file (API paths)
- `apps/backend/src/contracts/admin.ts` — new file (API paths)
- `apps/backend/src/contracts/setup.ts` — new file (API paths)
- `apps/backend/src/contracts/index.ts` — new file (re-exports)

## Dependencies
Depends on Step 03 (old contracts deleted, clean slate).

## Current Behavior
No token utilities, no cookie constants, no contracts exist (deleted in Step 03).

## Expected Behavior

### Token utilities (`shared/token.utils.ts`)

```typescript
import { createHash, randomBytes } from 'crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex'); // 256 bits
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

### Cookie constants (`shared/cookie.constants.ts`)

```typescript
export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const ACCESS_TOKEN_PATH = '/api/';
export const REFRESH_TOKEN_PATH = '/api/session/refresh';

export function getSessionCookieDomain(): string {
  const value = process.env.SESSION_COOKIE_DOMAIN;
  if (!value || value.trim().length === 0) {
    throw new Error('SESSION_COOKIE_DOMAIN is required');
  }
  return value;
}

export function getAccessTokenTtlSeconds(): number {
  return Number(process.env.ACCESS_TOKEN_TTL_SECONDS) || 900; // 15 min
}

export function getRefreshTokenTtlSeconds(): number {
  return Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 2592000; // 30 days
}

export function getAccessTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: ACCESS_TOKEN_PATH,
    domain: getSessionCookieDomain(),
    maxAge: getAccessTokenTtlSeconds() * 1000,
  };
}

export function getRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: REFRESH_TOKEN_PATH,
    domain: getSessionCookieDomain(),
    maxAge: getRefreshTokenTtlSeconds() * 1000,
  };
}
```

### Contracts

**`contracts/auth.ts`**:
```typescript
import { z } from 'zod';

export const loginFormSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(43),
  code_challenge_method: z.literal('S256'),
  state: z.string().min(1),
}).strict();

export type LoginFormDto = z.infer<typeof loginFormSchema>;

export const tokenExchangeSchema = z.object({
  code: z.string().min(1),
  codeVerifier: z.string().min(43),
}).strict();

export type TokenExchangeDto = z.infer<typeof tokenExchangeSchema>;

export const AUTH_API_PATHS = {
  login: '/api/auth/login',
  token: '/api/auth/token',
} as const;
```

**`contracts/session.ts`**:
```typescript
import { z } from 'zod';

export const logoutSchema = z.object({
  allDevices: z.boolean().default(false),
}).strict();

export type LogoutDto = z.infer<typeof logoutSchema>;

export const SESSION_API_PATHS = {
  status: '/api/session/status',
  refresh: '/api/session/refresh',
  logout: '/api/session/logout',
} as const;
```

**`contracts/admin.ts`**:
```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  fullname: z.string().trim().min(1),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
}).strict();

export type CreateUserDto = z.infer<typeof createUserSchema>;

export const revokeSessionsSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().optional(),
}).strict();

export type RevokeSessionsDto = z.infer<typeof revokeSessionsSchema>;

export const ADMIN_API_PATHS = {
  users: '/api/admin/users',
  revokeSessions: '/api/admin/sessions/revoke',
} as const;
```

**`contracts/setup.ts`**:
```typescript
import { z } from 'zod';

export const setupInitSchema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
  fullname: z.string().trim().min(1),
}).strict();

export type SetupInitDto = z.infer<typeof setupInitSchema>;

export const SETUP_API_PATHS = {
  status: '/api/setup/status',
  init: '/api/setup/init',
} as const;
```

**`contracts/index.ts`**: re-exports from all contract files.

## Specification

1. Create `apps/backend/src/shared/` directory.
2. Create `token.utils.ts` with `generateToken()` and `hashToken()`.
3. Create `cookie.constants.ts` with cookie names, paths, domain getter, TTL getters, and cookie option factories.
4. Create all contract files in `apps/backend/src/contracts/`.
5. Verify imports compile.

## Acceptance Criteria
1. `generateToken()` returns a 64-character hex string.
2. `hashToken()` returns consistent SHA-256 hex digest.
3. Cookie options include `httpOnly`, `secure`, `sameSite: 'none'`.
4. All Zod schemas validate correctly.
5. All files compile without errors.
6. Contracts importable via `@contracts/*` from frontend and mobile.

## Verification Scenario
1. Import `generateToken` and `hashToken` in a test script — verify output format.
2. Import Zod schemas — verify validation works.

## Testing
Unit tests in Step 24.

## Notes
- `SESSION_COOKIE_DOMAIN` env variable already exists in the project (used by the old session code).
- `getSessionCookieDomain()` throws on startup if missing — same pattern as the old code.
- TTL env vars (`ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS`) are optional with sensible defaults.
