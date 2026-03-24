---

## step-imp — 2026-03-23T16:21:40+03:00

**Result**: SUCCESS

### Changed Files
- `apps/backend/src/auth/auth.module.ts` — added `AuthModule` with `PrismaModule`, `AuthController`, `AuthService`, and `CodeStore`.
- `apps/backend/src/auth/auth.controller.ts` — implemented `GET /auth/login` HTML serving and `POST /auth/login` handler wiring.
- `apps/backend/src/auth/auth.service.ts` — implemented login validation (Zod), credentials check, auth code generation, redirect assembly, and code-store writes.
- `apps/backend/src/auth/code-store.ts` — implemented in-memory one-time auth code store with 60-second TTL and cleanup interval.
- `apps/backend/src/auth/login-page/login.html` — added static login form with inline JS posting to `/api/auth/login`.
- `apps/backend/src/auth/code-store.spec.ts` — added unit tests for one-time consume and expiry behavior.
- `apps/backend/src/auth/auth.controller.spec.ts` — added endpoint tests for HTML response, success login, invalid credentials, malformed payload, and `clientType`.
- `apps/backend/src/app.module.ts` — registered `AuthModule`.
- `apps/backend/vitest.config.ts` — added `@contracts` alias for backend test runtime.
- `.dev/steps/05-auth-code-store-login-page-endpoint.md` — added `<CORRECTION>` for `code_challenge` length and fixed verification URL example.
- `.dev/context.md` — documented static file path behavior in backend dev bundle runtime.

### Tests
- Task-specific: 7 passed, 0 failed (`src/auth/code-store.spec.ts`, `src/auth/auth.controller.spec.ts`).
- Regression: 17 passed, 0 failed (`docker exec kris-backend-test npm test`).

### Acceptance Criteria
- [x] AC-1: `GET /api/auth/login` returns HTML form — verified by `src/auth/auth.controller.spec.ts`.
- [x] AC-2: valid form submission returns redirect with `code` and `state` — verified by `src/auth/auth.controller.spec.ts`.
- [x] AC-3: invalid credentials return 401 — verified by `src/auth/auth.controller.spec.ts`.
- [x] AC-4: code stored in memory and retrievable via `consume` — verified by `src/auth/auth.controller.spec.ts` and `src/auth/code-store.spec.ts`.
- [x] AC-5: code expires after 60 seconds — verified by `src/auth/code-store.spec.ts`.
- [x] AC-6: code is consumable only once — verified by `src/auth/code-store.spec.ts`.
- [x] AC-7: malformed payload rejected with 400 — verified by `src/auth/auth.controller.spec.ts`.
- [x] AC-8: `clientType` derived from `redirect_uri` — verified by `src/auth/auth.controller.spec.ts`.

### Discoveries
- In backend watch mode bundle, `__dirname` points to `dist`, so static `src` HTML must be read via `process.cwd()` path unless copied to build output.
