# Step 03: Remove old session code and enable CORS

## Goal
Delete all old session/auth code across backend, frontend, and mobile. Enable CORS with reflected Origin. Leave the codebase compilable but auth-less.

## Motivation
The old cookie-session model is incompatible with OAuth 2.0. Clean removal prevents stale imports. CORS must be enabled early because the new OAuth flow is cross-origin.

## Type
refactor, backend, infra

## Affected Area

**Backend — delete entire directory:**
- `apps/backend/src/session/` (all files: controller, service, guard, constants, contract, module, decorator, request type, all specs)

**Backend — delete:**
- `apps/backend/src/contracts/session.ts`
- `apps/backend/src/contracts/index.ts`

**Backend — modify:**
- `apps/backend/src/app.module.ts` — remove `SessionModule` import
- `apps/backend/src/main.ts` — add CORS configuration

**Frontend — delete:**
- `apps/frontend/src/api/session.ts`
- `apps/frontend/src/state/session.ts`
- `apps/frontend/src/middleware/sessionCheckMiddleware.tsx`
- `apps/frontend/src/queryOptions/session.ts`
- `apps/frontend/src/queryOptions/session.test.ts`
- `apps/frontend/src/routes/~session-test.tsx`
- `apps/frontend/e2e/session-test/` (entire directory)

**Frontend — modify:**
- `apps/frontend/src/main.tsx` — remove `SessionCheckMiddleware` wrapper

**Mobile — delete:**
- `apps/mobile/src/api/session.ts`
- `apps/mobile/src/state/session.ts`
- `apps/mobile/src/query-options/session.ts`
- `apps/mobile/app/(tabs)/session-test.tsx`

**Mobile — modify:**
- `apps/mobile/app/(tabs)/_layout.tsx` — remove session-test tab

## Dependencies
Depends on Step 02 (migrations applied, old Session model removed from Prisma).

## Current Behavior
Backend has `SessionModule` with cookie-based login. Frontend/mobile have API clients, atoms, middleware, and test pages.

## Expected Behavior

1. All listed files deleted.
2. `app.module.ts` no longer imports `SessionModule`.
3. `main.tsx` renders app without `SessionCheckMiddleware`.
4. Mobile tab layout without session-test.
5. **CORS enabled** in `apps/backend/src/main.ts`:
```typescript
app.enableCors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```
6. All projects compile without errors.

## Specification

1. Delete `apps/backend/src/session/` directory.
2. Delete contracts files.
3. Update `app.module.ts` — remove `SessionModule`.
4. Delete frontend session files + middleware + test page + E2E.
5. Update `main.tsx` — remove middleware wrapper.
6. Delete mobile session files + test screen.
7. Update mobile `_layout.tsx` — remove tab entry.
8. Add CORS to `main.ts` (after `cookieParser`, before `listen`).
9. Regenerate TanStack Router route tree if needed.
10. Verify all three apps compile.

## Acceptance Criteria
1. `apps/backend/src/session/` does not exist.
2. CORS is enabled with reflected origin and credentials.
3. Backend responds to `OPTIONS` with correct CORS headers.
4. All three apps compile without errors.

## Verification Scenario
1. Start backend.
2. `curl -X OPTIONS https://kotel.localhost/api/users -H "Origin: https://evil.com" -v` — response includes `Access-Control-Allow-Origin: https://evil.com`.
3. `GET /api/users` still works.

## Testing
Compilation check only.

## Notes
- Keep `cookie-parser` in `main.ts` — needed for new auth cookies.
- Keep `apps/frontend/src/global/axiosLimitter.ts` — may be reused or removed later.
- `origin: true` in NestJS reflects the `Origin` header back, adding `Vary: Origin` automatically.
