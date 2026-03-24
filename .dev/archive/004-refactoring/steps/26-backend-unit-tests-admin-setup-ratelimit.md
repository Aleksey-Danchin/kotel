# Step 26: Backend unit/integration tests — admin, setup, rate limiting

## Goal
Write Vitest tests for the admin module (role guard, user CRUD, session revocation), setup module (first-run flow), and rate limiter.

## Motivation
Admin operations involve complex role hierarchies and permission logic. Setup has a one-time constraint. Rate limiting has counter thresholds and time windows.

## Type
test, backend

## Affected Area
- `apps/backend/src/admin/admin.service.spec.ts` — new file
- `apps/backend/src/admin/roles.guard.spec.ts` — new file
- `apps/backend/src/setup/setup.service.spec.ts` — new file
- `apps/backend/src/auth/rate-limiter.spec.ts` — new file

## Dependencies
Depends on Steps 12-14 (admin, setup, rate limiting code).

## Current Behavior
No tests for these modules.

## Expected Behavior

### Admin service tests (`admin.service.spec.ts`)
- ROOT creates ADMIN → success.
- ROOT creates USER → success.
- ADMIN creates USER → success.
- ADMIN creates ADMIN → 403.
- Nobody creates ROOT → validation error (400).
<CORRECTION by="step-executor" reason="contract already forbids ROOT in create dto">
`createUserSchema` does not allow role `ROOT`, so this path fails at DTO validation with 400 before role-authorization logic.
</CORRECTION>
- Delete USER as ROOT → success.
- Delete ROOT → 403.
- Delete self → 403.
- ADMIN deletes ADMIN → 403.
- Session revocation by admin → correct count returned.
- Revocation sets noActiveReason to MANUAL_REVOKE.

### Roles guard tests (`roles.guard.spec.ts`)
- No `@Roles()` metadata → access granted.
- `@Roles('ADMIN', 'ROOT')` with ADMIN user → granted.
- `@Roles('ADMIN', 'ROOT')` with USER → denied.
- `@Roles('ROOT')` with ADMIN → denied.
- `@Roles('ROOT')` with ROOT → granted.

### Setup service tests (`setup.service.spec.ts`)
- `getStatus()` with 0 users → `{ available: true }`.
- `getStatus()` with 1+ users → `{ available: false }`.
- `init(dto)` with 0 users → ROOT user created.
- `init(dto)` with 1+ users → 403.
- Created user has role ROOT.

### Rate limiter tests (`rate-limiter.spec.ts`)
- First attempt → allowed.
- 3 attempts → captcha required.
<CORRECTION by="step-executor" reason="current implementation threshold behavior">
`RateLimiter.checkLimits()` enables captcha when active IP attempts are `>= ipCaptchaThreshold - 1` (default: 3), so the 3rd failed attempt already requires captcha.
</CORRECTION>
- 4th attempt → captchaRequired true.
- 7th attempt → blocked (429 reason).
- 10 attempts for same username → blocked.
- Successful login resets username counter.
- After window expires → allowed again (advance time with `vi.useFakeTimers()`).
- Different IPs have independent counters.
- Different usernames have independent counters.

## Specification

1. Use Vitest.
2. Mock PrismaService for unit tests.
3. Use `vi.useFakeTimers()` for rate limiter time-based tests.
4. Follow workspace test conventions.

## Acceptance Criteria
1. All tests pass.
2. Admin service: 11+ tests.
3. Roles guard: 5+ tests.
4. Setup service: 4+ tests.
5. Rate limiter: 9+ tests.
6. No Jest usage.

## Verification Scenario
Run test suite → all green.

## Testing
This step IS the testing step.

## Notes
- Rate limiter tests benefit greatly from fake timers — advance time to test window expiry.
- Admin tests need to mock the request object with `user.role` populated.
