---

## step-imp — 2026-03-23T17:15:15+03:00

**Result**: SUCCESS

### Changed Files
- `apps/backend/src/auth/rate-limiter.ts` — added in-memory sliding-window rate limiter with IP and username counters, retry-after calculation, and env-configurable thresholds.
- `apps/backend/src/auth/auth.controller.ts` — integrated login pre-checks, block responses with `Retry-After`, 5s delay in CAPTCHA zone, failed-attempt recording, username reset on success, and forwarded-IP extraction.
- `apps/backend/src/auth/auth.module.ts` — registered `RateLimiter` provider in auth module.
- `apps/backend/src/main.ts` — enabled `trust proxy` for correct client IP handling behind Traefik.
- `apps/backend/src/auth/auth.controller.spec.ts` — expanded integration coverage for rate-limiting behavior, captcha flag/delay, IP block, username block, reset-on-success, block expiry, and forwarded IP handling.
- `.dev/steps/12-rate-limiting.md` — added `<CORRECTION>` notes for delay contradiction and test execution scope.
- `docs/AUTH_DESIGN.md` — aligned rate-limiting docs with implemented single CAPTCHA-zone delay and `captchaRequired` response flag.

### Tests
- Task-specific: 15 passed, 0 failed
- Regression: 81 passed, 0 failed

### Acceptance Criteria
- [x] AC-1: First 3 wrong passwords return 401 — verified by: `src/auth/auth.controller.spec.ts`.
- [x] AC-2: 4th attempt returns 401 with `captchaRequired: true` and ~5s delay — verified by: `src/auth/auth.controller.spec.ts`.
- [x] AC-3: 7th attempt from same IP returns 429 with retry-after — verified by: `src/auth/auth.controller.spec.ts`.
- [x] AC-4: 10th attempt for same username across IPs returns 429 — verified by: `src/auth/auth.controller.spec.ts`.
- [x] AC-5: Successful login resets username counter — verified by: `src/auth/auth.controller.spec.ts`.
- [x] AC-6: Attempts are allowed again after block window — verified by: `src/auth/auth.controller.spec.ts` (time-shifted Date.now in test).
- [x] AC-7: Client IP is resolved correctly behind proxy chain — verified by: `src/auth/auth.controller.spec.ts` and dev smoke `curl`.

### Discoveries
- `docker compose -f infra/compose/test.yml` requires `PROJECT_ROOT` to be exported in shell context for reliable command execution.
