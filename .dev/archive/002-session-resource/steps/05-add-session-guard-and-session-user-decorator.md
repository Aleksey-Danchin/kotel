# Step 05: Add Session Guard and SessionUser Decorator

## Goal
Introduce `SessionGuard` with strong/weak modes and a `@SessionUser()` decorator backed by lazy request-scoped user resolution.

## Motivation
Endpoints need flexible authorization behavior: strict protection by default, optional anonymous access in weak mode, and reusable session user extraction.

## Type
feature, backend, architectural

## Affected Area
`apps/backend/src/session/*` (guard, decorator, request typing helpers), backend controller usage examples, Nest exception handling path

## Dependencies
Depends on steps 03, 04

## Current Behavior
No session guard or session-user decorator exists. Endpoint authorization cannot rely on session cookies.

## Expected Behavior
- `@UseGuards(SessionGuard)` behaves as strong mode by default (`401` when session invalid/missing).
- `@UseGuards(new SessionGuard({ strong: true }))` behaves same as default strong mode.
- `@UseGuards(new SessionGuard({ strong: false }))` allows request through and provides `sessionUser = null` when no valid session.
- Guard injects lazy async `getSessionUser` on request object with memoization within a request.

## Specification
- Create configurable `SessionGuard`:
  - supports options object `{ strong?: boolean }`
  - default is `strong: true`
  - validates session cookie presence and DB session validity
  - integrates stale session behavior from Step 04 (including cookie clearing when stale encountered)
- Request augmentation:
  - attach `req.getSessionUser: () => Promise<User | null>`
  - implementation uses closure memoization so repeated calls in same request do not re-query DB
- Add `@SessionUser()` decorator:
  - obtains user via `req.getSessionUser`
  - when decorator is used without guard and `getSessionUser` is missing, throw `UnauthorizedException`
- Ensure `check` endpoint and other routes can rely on this mechanism without duplicate user-fetch code.

## Acceptance Criteria
1. Session guard supports default, strong, and weak behavior exactly as specified.
2. Request contains lazy async `getSessionUser` when guard executes.
3. Multiple `getSessionUser` calls in one request perform a single user query.
4. `@SessionUser()` returns `User | null` depending on mode and session state.
5. Missing `getSessionUser` path throws `UnauthorizedException`.

## Verification Scenario
1. Protect a test endpoint with default guard and call without cookie -> `401`.
2. Protect same endpoint with weak mode and call without cookie -> `200`, `sessionUser` is `null`.
3. Call endpoint that invokes `getSessionUser` twice and verify single DB fetch.
4. Use `@SessionUser()` on endpoint without guard in test-only setup and verify `UnauthorizedException`.

## Testing
- Backend Vitest integration tests for guard mode matrix and stale-cookie handling.
- Focused tests for request memoization behavior.
- Negative-path test for decorator without guard.

## Notes
- In production code, keep `@SessionUser()` usage paired with guard as the default convention.
