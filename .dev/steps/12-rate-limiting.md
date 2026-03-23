# Step 12: Rate limiting on /api/auth/login

## Goal
Implement sliding-window rate limiting on the login endpoint with dual counters (by IP and by username) and progressive delays.

## Motivation
Protects against brute-force password attacks. Two counters cover NAT scenarios (many users behind one IP) and distributed attacks (one username from many IPs).

## Type
feature, backend, security

## Affected Area
- `apps/backend/src/auth/rate-limiter.ts` — new file
- `apps/backend/src/auth/auth.controller.ts` — apply rate limiting to POST /auth/login
- `apps/backend/src/main.ts` — add `trust proxy` for correct IP extraction behind Traefik

## Dependencies
Depends on Step 05 (auth login endpoint).

## Current Behavior
Login can be attempted unlimited times.

## Expected Behavior

### Dual counter system

**By IP (sliding window, 15 min):**
- 1–3 attempts → no restriction
- 4–6 attempts → `captchaRequired: true` flag in response + 5s delay
- 7+ attempts → IP blocked for 15 minutes → 429

**By username (across all IPs, 15 min):**
- 1–9 attempts → no restriction
- 10+ attempts → username blocked for 15 minutes → 429

### RateLimiter service (`rate-limiter.ts`)

Injectable NestJS service:

```typescript
@Injectable()
export class RateLimiter implements OnModuleDestroy {
  private ipCounters = new Map<string, number[]>(); // timestamps
  private usernameCounters = new Map<string, number[]>();
  private windowMs = 15 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.purgeExpired(), 5 * 60 * 1000);
  }

  checkLimits(ip: string, username: string): RateLimitResult
  recordFailedAttempt(ip: string, username: string): void
  resetUsername(username: string): void // on successful login
  onModuleDestroy() { clearInterval(this.cleanupInterval); }
}

type RateLimitResult = {
  allowed: boolean;
  captchaRequired: boolean;
  retryAfterSeconds?: number;
  reason?: 'ip_blocked' | 'username_blocked';
};
```

### Progressive delays

At 4+ attempts: `await new Promise(resolve => setTimeout(resolve, 5000))` before responding. At 6+ attempts: 30s delay. Delays apply to both success and failure (prevents timing attacks).
<CORRECTION by="step-executor" reason="contradiction with dual-counter thresholds and acceptance criteria">
Applied a single progressive delay of ~5s for the CAPTCHA range only (IP attempts 4-6). The 30s delay at 6+ conflicts with the table above (`4-6 -> 5s`, `7+ -> block`) and would make the 6th attempt behavior inconsistent.
</CORRECTION>

### Integration into auth login

In `POST /auth/login` handler, before credential validation:
1. `checkLimits(ip, username)` → if blocked → 429 with `Retry-After` header.
2. After failed validation: `recordFailedAttempt(ip, username)`.
3. After successful validation: `resetUsername(username)`.

### Trust proxy

Add to `main.ts`:
```typescript
const app = await NestFactory.create(AppModule);
app.getHttpAdapter().getInstance().set('trust proxy', 1);
```

### Environment variables (all optional with defaults)

`RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_IP_CAPTCHA_THRESHOLD`, `RATE_LIMIT_IP_BLOCK_THRESHOLD`, `RATE_LIMIT_USERNAME_BLOCK_THRESHOLD`.

## Specification

1. Create `rate-limiter.ts` with sliding window logic.
2. Inject into auth module.
3. Integrate into `POST /auth/login` flow.
4. Add `trust proxy` to `main.ts`.
5. Add CAPTCHA placeholder (flag in response, no actual challenge).

## Acceptance Criteria
1. First 3 wrong passwords → 401 normally.
2. 4th attempt → 401 with `captchaRequired: true`, ~5s delay.
3. 7th attempt from same IP → 429 with `retryAfter`.
4. 10th attempt for same username (any IP) → 429.
5. Successful login resets username counter.
6. After block period → allowed again.
7. `request.ip` returns real client IP (not Traefik's IP).

## Verification Scenario
1. Wrong password 7 times → 429 on 7th.
2. Wait 15 minutes → allowed again.

## Testing
Unit tests in Step 26.
<CORRECTION by="step-executor" reason="step execution requires verification in the current step">
Added and ran backend integration tests for login rate limiting in this step to verify all acceptance criteria now, instead of postponing tests to a later step.
</CORRECTION>

## Notes
- In-memory counters reset on server restart — acceptable for single-instance self-hosted server.
- CAPTCHA is a placeholder flag. Actual CAPTCHA integration deferred.
