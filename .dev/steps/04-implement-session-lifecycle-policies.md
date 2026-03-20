# Step 04: Implement Session Lifecycle Policies

## Goal
Implement session expiration, sliding activity updates, capped active-session policy, and periodic stale-session cleanup executed from the session module lifecycle.

## Motivation
Session data must remain bounded and self-cleaning. The product requires idle timeout handling, automatic extension on use, and strict cleanup behavior.

## Type
backend, feature, data-model

## Affected Area
`apps/backend/src/session/*`, `apps/prisma/schema/Session.prisma` usage layer, backend environment config, module lifecycle hooks

## Dependencies
Depends on steps 03

## Current Behavior
`Session` model exists with `lastUsedAt`, but no runtime policy enforces expiration, refresh, or cardinality. No periodic cleanup worker exists.

## Expected Behavior
- Every successful session usage refreshes `lastUsedAt`.
- `IDLE_TIMEOUT` (seconds) defines stale threshold.
- Stale sessions are removed proactively and opportunistically.
- Max active sessions per user is hardcoded to 10 with custom overflow policy:
  - remove stale sessions first
  - if still at 10 and creating the 11th, remove the youngest active existing session (max `lastUsedAt`) before inserting the new one.
- Session module starts cleanup on bootstrap and repeats hourly.

## Specification
- Introduce `IDLE_TIMEOUT` env variable (seconds) and central helper to compute stale cutoff.
- On every successful session use (`check`, guard-validated request path, and equivalent service access), update `lastUsedAt = now`.
- Expiration handling:
  - if session is stale, delete it
  - clear cookie in response path where stale session is detected
- Cap policy per user:
  - hardcode limit constant `10`
  - before creating a new session:
    1) delete stale sessions for that user
    2) if active count still equals limit, delete the most recently used existing active session (highest `lastUsedAt`)
    3) create new session
- Periodic cleanup execution model:
  - schedule from `SessionModule` lifecycle (`constructor` wiring with `setInterval`)
  - run cleanup immediately on module init
  - repeat every hour
  - clear interval on module destroy
- Ensure cleanup logic is reusable by both timer path and inline request-path checks.

## Acceptance Criteria
1. `IDLE_TIMEOUT` is required/read by backend session logic.
2. Successful session access updates `lastUsedAt`.
3. Stale sessions are deleted and corresponding cookie is cleared when detected.
4. On overflow beyond 10 active sessions per user, youngest active existing session is deleted before creating a new one.
5. Module triggers cleanup immediately and then every hour.
6. Interval is released on shutdown.

## Verification Scenario
1. Create sessions for one user up to limit.
2. Create an additional session and verify overflow policy deletes the youngest old one.
3. Simulate stale session and verify it is deleted on access.
4. Confirm cookie is cleared for stale session responses.
5. Advance fake timers or wait strategy to verify periodic cleanup trigger.

## Testing
- Backend Vitest integration tests for:
  - `IDLE_TIMEOUT` expiration behavior
  - overflow policy logic (including stale-first deletion)
  - timer setup/teardown and hourly trigger semantics
- Use fake timers for lifecycle scheduling where suitable.

## Notes
- Yes, Vitest supports fake timers; use them to validate module interval behavior deterministically.
- The “delete youngest active session” policy is intentional and non-standard; preserve exactly as specified.
