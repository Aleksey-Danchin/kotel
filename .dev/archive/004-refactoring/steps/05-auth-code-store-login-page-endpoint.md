# Step 05: Auth module — code store, login page, POST /auth/login

## Goal

Create the `AuthModule` with the in-memory authorization code store, the static HTML login page, and the `POST /api/auth/login` endpoint that processes the login form and generates an authorization code.

## Motivation

This is the OAuth authorization endpoint — the entry point where the user authenticates on the server's own page. The code store holds short-lived authorization codes in memory. The login page is what appears in the popup (web) or system browser (mobile).

## Type

feature, backend

## Affected Area

- `apps/backend/src/auth/` — new module (generate via `npx nest generate resource auth --no-spec`)
- `apps/backend/src/auth/auth.module.ts`
- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/auth/auth.service.ts`
- `apps/backend/src/auth/code-store.ts`
- `apps/backend/src/auth/login-page/login.html` — static HTML
- `apps/backend/src/app.module.ts` — register AuthModule

## Dependencies

Depends on Step 04 (token utils, Zod contracts).

## Current Behavior

No auth module exists.

## Expected Behavior

### In-memory code store (`code-store.ts`)

An injectable NestJS service wrapping a `Map<string, CodeEntry>`:

```typescript
type CodeEntry = {
  codeChallenge: string;
  redirectUri: string;
  state: string;
  userId: string;
  clientType: "WEB" | "EXPO";
  createdAt: number; // Date.now()
};
```

Methods:

- `store(code: string, entry: CodeEntry): void` — saves entry.
- `consume(code: string): CodeEntry | null` — returns entry and deletes it. Returns null if not found or expired (>60 seconds).
- Periodic cleanup: `setInterval` every 60s removes expired entries.
- Cleanup interval cleared on module destroy.

### `GET /api/auth/login`

Serves a static HTML page. The controller reads the file and sends it with `Content-Type: text/html`.

Query parameters are NOT validated server-side on GET — they're consumed by the page's JavaScript. The page:

1. Reads `redirect_uri`, `code_challenge`, `code_challenge_method`, `state` from URL search params.
2. Shows a form with `login` and `password` inputs.
3. On submit: `fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({login, password, redirect_uri, code_challenge, code_challenge_method, state}) })`.
4. On success (response has `redirect` field): `window.location.href = response.redirect`.
5. On error: show error message on the page.

The HTML is MVP — no CSS framework, plain HTML elements, minimal inline JS.

### `POST /api/auth/login`

Request body: validated with `loginFormSchema` from contracts.

Behavior:

1. Validate body with Zod. Invalid → 400.
2. Find user by `login`. Not found → 401 `{ message: "Invalid credentials" }`.
3. Compare password with bcrypt. Mismatch → 401.
4. Generate authorization code: `crypto.randomBytes(32).toString('hex')`.
5. Determine `clientType` from `redirect_uri`:
   - Starts with `https://` → `WEB`
   - Otherwise → `EXPO`
6. Store in code store: `{ codeChallenge, redirectUri, state, userId, clientType }`.
7. Return `{ redirect: "${redirect_uri}?code=${code}&state=${state}" }`.

### Notes on the controller

Both `GET` and `POST` at `/auth/login` are on the same controller path. The GET serves HTML, the POST processes JSON. Both should eventually be decorated with `@Public()` (added in Step 08 when the guard is implemented).

## Specification

1. Generate NestJS resource: `npx nest generate resource auth --no-spec` (in backend container).
2. Create `CodeStore` as `@Injectable()` with `OnModuleDestroy` for cleanup.
3. Create `login.html` in `apps/backend/src/auth/login-page/`.
4. Implement `GET /auth/login` — read HTML file, send as response.
5. Implement `POST /auth/login` — validate, authenticate, generate code, return redirect.
6. Register `AuthModule` in `AppModule`.
7. Import `PrismaModule` in `AuthModule` for user lookup.

## Acceptance Criteria

1. `GET /api/auth/login?redirect_uri=...&code_challenge=...&code_challenge_method=S256&state=...` returns HTML page with login form.
2. Submitting the form with valid credentials returns JSON with redirect URL containing `code` and `state`.
3. Invalid credentials return 401.
4. Code is stored in memory and retrievable via `CodeStore.consume()`.
5. Code expires after 60 seconds.
6. Code can be consumed only once.
7. Zod validation rejects malformed requests with 400.
8. `clientType` correctly detected from redirect_uri.

## Verification Scenario

<CORRECTION by="step-executor" reason="Verification values must satisfy loginFormSchema">
`code_challenge` from Step 04 contracts requires a minimum length of 43 characters, so `test123` is invalid for a successful login scenario.
</CORRECTION>
1. Open browser: `https://kotel.localhost/api/auth/login?redirect_uri=https://kotel.localhost/callback&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256&state=abc123`.
2. See a login form.
3. Enter `user1` / `123`, submit.
4. Response contains `{ redirect: "https://kotel.localhost/callback?code=...&state=abc123" }`.

## Testing

Unit tests in Step 24.

## Notes

- The login page must work in both popup (web) and system browser (mobile). No `window.opener` assumptions.
- The POST endpoint is NOT protected by the access token guard (it's called before any token exists).
- Rate limiting will be added in Step 12.
