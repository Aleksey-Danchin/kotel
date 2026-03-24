# Step 25: Backend unit/integration tests — auth and session modules

## Goal
Write Vitest tests for the auth module (code store, login, token exchange, PKCE) and session module (guard, service, refresh, reuse detection).

## Motivation
These modules handle security-critical logic. Tests verify token generation, hashing, PKCE verification, atomic rotation, reuse detection modes, guard behavior, and channel verification.

## Type
test, backend

## Affected Area
- `apps/backend/src/auth/code-store.spec.ts` — new file
- `apps/backend/src/auth/auth.service.spec.ts` — new file
- `apps/backend/src/session/session.service.spec.ts` — new file
- `apps/backend/src/session/session.guard.spec.ts` — new file
- `apps/backend/src/shared/token.utils.spec.ts` — new file

## Dependencies
Depends on Steps 04-11 (all backend auth/session code).

## Current Behavior
No tests for the new auth/session system.

## Expected Behavior

### Token utils tests (`token.utils.spec.ts`)
- `generateToken()` returns 64-char hex string.
- Different calls produce different tokens.
- `hashToken()` produces consistent SHA-256 hex digest.
- `hashToken(token) !== token`.

### Code store tests (`code-store.spec.ts`)
- Store and consume a code → returns entry.
- Consume same code twice → second returns null.
- Expired code (>60s) → returns null.
- Store multiple codes → each consumable independently.

### Auth service tests (`auth.service.spec.ts`)
- Login with valid credentials → code generated, stored.
- Login with invalid login → 401.
- Login with wrong password → 401.
- Token exchange with valid code + codeVerifier → session created, tokens returned.
- Token exchange with invalid codeVerifier (PKCE fail) → 400.
- Token exchange with expired code → 400.
- Token exchange with consumed code → 400.
- clientType detection: `https://...` → WEB, `kotel://...` → EXPO.
- WEB exchange → tokens in cookies (mock response).
- EXPO exchange → tokens in body.

### Session service tests (`session.service.spec.ts`)
- `markAsUsed` on ACTIVE session → returns session, status becomes USED.
- `markAsUsed` on USED session → returns null.
- `markAsUsed` on REVOKED session → returns null.
- `revokeChain(sessionId)` → all sessions with that sessionId revoked.
- `revokeAllUserSessions` → all user sessions revoked.
- `cleanupExpiredSessions` → expired sessions marked.

### Session guard tests (`session.guard.spec.ts`)
- Request with valid cookie → access granted, `request.user` populated.
- Request without token → 401.
- Expired access token → 401, session marked EXPIRED.
- WEB session + Bearer delivery → 401.
- EXPO session + cookie delivery → 401.
- `@Public()` endpoint → access granted without token.
- Both cookie and Bearer present → 401.

### Reuse detection tests (in session.service.spec.ts)
- Reuse detected + debug mode → sessions untouched.
- Reuse detected + isolation mode → chain revoked.
- Reuse detected + quarantine mode → all user sessions revoked.
- Reuse detected + lockdown mode → all user sessions revoked.

## Specification

1. Use Vitest (NOT Jest).
2. Mock PrismaService for unit tests.
3. Use real database for integration tests (docker test containers).
4. Follow the backend test environment conventions from workspace rules.
5. Tests run via `vitest run` in the test Docker container.

## Acceptance Criteria
1. All tests pass.
2. Token utils: 4+ tests.
3. Code store: 4+ tests.
4. Auth service: 8+ tests.
5. Session service: 6+ tests.
6. Session guard: 7+ tests.
7. Reuse detection: 4+ tests.
8. No Jest usage — Vitest only.

## Verification Scenario
Run test suite → all green.

## Testing
This step IS the testing step.

## Notes
- Use the test-runner skill for running tests.
- Integration tests that need the database should use the test compose stack (`infra/compose/test.yml`).
- Mock bcrypt with a predictable hash for auth service tests.
