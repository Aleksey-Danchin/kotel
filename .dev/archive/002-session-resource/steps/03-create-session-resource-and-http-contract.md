# Step 03: Create Session Resource and HTTP Contract

## Goal
Implement the new NestJS `session` resource (generated via Nest util) with `signin`, `signout`, and `check` endpoints, including cookie transport and Zod-based request validation.

## Motivation
Authentication/session behavior is now a core backend responsibility. The project needs a formal API contract and secure session cookie handling under `/api`.

## Type
feature, backend, architectural

## Affected Area
`apps/backend/src/app.module.ts`, `apps/backend/src/main.ts`, new `apps/backend/src/session/*`, backend env/config files, `apps/backend/package.json` (Zod dependency), shared type import aliases between frontend/backend

## Dependencies
Depends on steps 01, 02

## Current Behavior
Backend has only `users` resource and no session flow:
- `AppModule` imports only `PrismaModule` and `UsersModule`.
- `main.ts` sets global prefix only, without cookie parser/cookie policy wiring.

## Expected Behavior
Backend exposes:
- `POST /api/session/signin` with body `{ login, password }`, returning `200` + user object on success.
- `POST /api/session/signout`.
- `GET /api/session/check`, always `200`, returning user when session is active, otherwise `null`.
Session is stored in secure HTTP-only cookie scoped to `/api` with configurable domain.

## Specification
- Generate the `session` resource structure using Nest CLI util (module/controller/service scaffolding), then adapt it.
- Install Zod in backend and use Zod schema validation for signin DTO parsing.
  - This round establishes Zod as primary DTO mechanism for backend contracts.
  - Maintain import alias strategy so frontend can consume backend-defined schemas/types when needed.
- Implement endpoint contracts:
  - `signin`:
    - validates body using Zod (`login`, `password`)
    - authenticates by `User.login` and password hash comparison
    - creates DB session record and sets cookie
    - returns authenticated user object
  - `signout`:
    - clears session cookie
    - removes corresponding DB session record when present
  - `check`:
    - resolves current session from cookie
    - returns user object if active; otherwise `null` (HTTP 200 always)
- Cookie configuration:
  - name: `session`
  - `httpOnly: true`
  - `secure: true`
  - `domain` from env variable (dev value: `kotel.localhost`)
  - `path: /api`
  - no `maxAge`
- Add and document required env variables:
  - cookie domain variable
  - any supporting session config variables introduced by later steps

## Acceptance Criteria
1. `session` module/controller/service exist and are registered in `AppModule`.
2. `POST /api/session/signin` validates body with Zod and returns user on success.
3. `POST /api/session/signout` clears cookie and invalidates session server-side.
4. `GET /api/session/check` always returns `200` with `user | null`.
5. Cookie options match required security and scoping configuration.
6. Zod is installed in backend and used for session DTO validation.

## Verification Scenario
1. Start environment.
2. Call `POST /api/session/signin` with valid credentials.
3. Verify response user and `Set-Cookie: session=...`.
4. Call `GET /api/session/check` with cookie and verify user.
5. Call `POST /api/session/signout` and verify cookie is cleared.
6. Call `GET /api/session/check` again and verify `null`.

## Testing
- Backend Vitest integration tests with real test DB (through test compose).
- Validation tests for malformed signin payloads.
- Manual smoke via curl/Postman for cookie headers and status codes.

## Notes
- Preserve user object sanitization conventions (no sensitive fields in API output).
- Keep endpoint behavior deterministic for guard integration in next steps.
