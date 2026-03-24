# Step 08: Access token guard and @Public decorator

## Goal
Create a global NestJS guard that validates access tokens on every request, extracts the session and user, and attaches them to the request. Create the `@Public()` decorator to exempt specific routes.

## Motivation
Every protected API request must be authenticated. The guard is the security perimeter that ensures only valid, non-expired sessions with correct delivery channels can access protected resources.

## Type
feature, backend, security

## Affected Area
- `apps/backend/src/session/session.guard.ts` — new file
- `apps/backend/src/session/public.decorator.ts` — new file
- `apps/backend/src/session/session-request.ts` — new file (typed request)
- `apps/backend/src/session/session.module.ts` — register guard as APP_GUARD
- `apps/backend/src/auth/auth.controller.ts` — apply `@Public()` to existing endpoints

## Dependencies
Depends on Step 07 (SessionService.findByAccessTokenHash).

## Current Behavior
No guard exists. All endpoints are publicly accessible.

## Expected Behavior

### `@Public()` decorator (`public.decorator.ts`)

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Access token guard (`session.guard.ts`)

Registered as `APP_GUARD` — runs on every request.

**Algorithm:**

1. Check `@Public()` metadata via Reflector. If public → pass through.

2. **Extract access token** — try both channels:
   - Cookie: `request.cookies?.accessToken`
   - Bearer: `request.headers.authorization?.replace('Bearer ', '')`
   - If both present → anomaly → 401.
   - If neither present → 401.
   - Track extraction source: `'cookie'` or `'bearer'`.

3. **Hash token** with SHA-256.

4. **Look up session** via `SessionService.findByAccessTokenHash(hash)`.
   - Not found → 401.

5. **Check status**: must be `ACTIVE`. Otherwise → 401.

6. **Check expiry**: if `accessTokenExpiresAt < now`:
   - Update session: `status = EXPIRED`, `noActiveAt = now`, `noActiveReason = EXPIRED` (via Prisma update).
   - Return 401.

7. **Channel verification**: compare extraction source with `session.clientType`:
   - WEB session expects cookie. If from bearer → 401.
   - EXPO session expects bearer. If from cookie → 401.

8. **Fingerprint check** (request `Origin` header vs session `fingerprint`):
   - Extract Origin from request: `request.headers.origin` or `request.headers.referer` (origin portion).
   - If Origin available and doesn't match `session.fingerprint`:
     - For state-changing methods (POST, PUT, DELETE, PATCH) → 403.
     - For read methods (GET) → log warning, allow.

9. **Attach to request**:
   - `request.user = session.user`
   - `request.session = { id: session.id, sessionId: session.sessionId, clientType: session.clientType }`

### Typed request (`session-request.ts`)

```typescript
import type { Request } from 'express';
import type { User, ClientType } from '~prisma/client/client';

export type SessionInfo = {
  id: string;
  sessionId: string;
  clientType: ClientType;
};

export type AuthenticatedRequest = Request & {
  user: User;
  session: SessionInfo;
};
```

### Apply `@Public()` to existing endpoints

In `AuthController` (from Steps 05-06):
- `GET /auth/login` → `@Public()`
- `POST /auth/login` → `@Public()`
- `POST /auth/token` → `@Public()`

### Guard registration

In `SessionModule`:
```typescript
providers: [
  SessionService,
  { provide: APP_GUARD, useClass: SessionGuard },
],
```

## Specification

1. Create `public.decorator.ts`.
2. Create `session-request.ts` type definitions.
3. Create `session.guard.ts` implementing the full algorithm.
4. Register as `APP_GUARD` in `SessionModule`.
5. Apply `@Public()` to auth controller endpoints.
6. Verify: `GET /api/users` now requires authentication (returns 401 without token).
7. Verify: auth endpoints remain accessible without token.

## Acceptance Criteria
1. `GET /api/users` without token → 401.
2. `GET /api/users` with valid access token cookie → 200 (for WEB session).
3. `GET /api/users` with valid Bearer token → 200 (for EXPO session).
4. Expired access token → 401, session marked EXPIRED in DB.
5. WEB session + Bearer delivery → 401 (channel mismatch).
6. EXPO session + cookie delivery → 401 (channel mismatch).
7. `@Public()` endpoints accessible without token.
8. `request.user` and `request.session` populated for authenticated requests.
9. Origin mismatch on POST → 403.

## Verification Scenario
1. Login via OAuth flow (Steps 05-06) → get cookies.
2. `GET /api/users` with cookies → 200.
3. `GET /api/users` without cookies → 401.
4. `GET /api/auth/login?...` without cookies → 200 (HTML page, public).

## Testing
Integration tests in Step 25.

## Notes
- The guard extracts from BOTH cookie and Bearer, then validates the channel after lookup. This is because the guard doesn't know the clientType before finding the session.
- `Origin` header is not always present (direct navigation, non-browser clients). If absent, skip fingerprint check.
- `Referer` header can be used as fallback for Origin (extract origin portion via `new URL(referer).origin`).
