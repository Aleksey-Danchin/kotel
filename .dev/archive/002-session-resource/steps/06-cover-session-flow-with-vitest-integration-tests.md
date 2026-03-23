# Step 06: Cover Session Flow with Vitest Integration Tests

## Goal
Create real integration coverage for session endpoints and policies using Vitest against the dedicated test compose environment and seeded database.

## Motivation
Session behavior includes cookies, DB state transitions, and timeout policies that cannot be reliably validated with mocked Prisma clients.

## Type
backend, bugfix, feature, test

## Affected Area
Backend Vitest test files under `apps/backend/src/**`, test utilities/bootstrap setup, `scripts/test-run.sh` integration

## Dependencies
Depends on steps 01, 02, 03, 04, 05

## Current Behavior
No real-DB endpoint tests for session exist. Legacy tests are scaffold-like and mock-based.

## Expected Behavior
Integration tests validate end-to-end backend session behavior with real DB migrations/seeds in isolated test environment.

## Specification
- Implement backend Vitest integration suites covering:
  - `POST /api/session/signin`
    - success with valid credentials
    - cookie set with required attributes (`httpOnly`, `secure`, `domain`, `path`)
    - invalid credentials behavior
  - `POST /api/session/signout`
    - cookie clearing
    - DB session invalidation
  - `GET /api/session/check`
    - returns user for active session
    - returns `null` with HTTP 200 for missing/invalid/expired session
    - clears cookie when stale session is detected
  - Guard behavior matrix:
    - default/strong unauthorized behavior (`401`)
    - weak mode pass-through with `null`
  - `getSessionUser` memoization
  - decorator missing-guard error path (`UnauthorizedException`)
  - session limit policy:
    - stale-first deletion
    - when full with active sessions, deletion of youngest active existing session
  - periodic cleanup behavior:
    - immediate run on startup path
    - hourly interval trigger
    - proper teardown on destroy
- Tests must run in the isolated test compose stack with seeded users and without using dev DB.
- Ensure deterministic time-sensitive tests using fake timers where applicable.

## Acceptance Criteria
1. Session endpoint integration tests exist and run with Vitest.
2. Tests use real DB state transitions, not mocked Prisma clients.
3. Expiration and cookie-clearing behavior is covered.
4. Guard/decorator behavior matrix is fully covered.
5. Session limit and periodic cleanup behaviors are covered.
6. `scripts/test-run.sh` runs these tests and returns proper exit status.

## Verification Scenario
1. Start test environment via `test-start.sh`.
2. Run backend Vitest integration suite.
3. Confirm passing coverage for signin/signout/check, guard, timeout, limit, and cleanup.
4. Stop test environment and verify no dev resources are impacted.

## Testing
- Primary: backend Vitest integration tests in test compose.
- Secondary: manual spot-check of API with curl for headers and status.

## Notes
- Keep tests aligned with actual API contracts; avoid brittle assertions on implementation internals unless required for policy validation.
