---

## step-imp — 2026-03-23T18:06:21+03:00

**Result**: SUCCESS

### Changed Files
- `apps/mobile/app.json` — switched Expo deep-link scheme from `mobile` to `kotel`.
- `apps/mobile/package.json` — added `vitest` and test script; `expo-secure-store` installed via Expo.
- `apps/mobile/package-lock.json` — lockfile updated after dependency installation.
- `apps/mobile/src/api/secure-store.ts` — added secure token storage wrapper over `expo-secure-store`.
- `apps/mobile/src/api/auth.ts` — implemented OAuth Authorization Code + PKCE flow with system browser callback handling, token exchange, state validation, secure storage, and session status fetch.
- `apps/mobile/src/api/secure-store.test.ts` — added unit tests for secure store keying/save/read/clear behavior.
- `apps/mobile/src/api/auth.test.ts` — added unit tests for happy-path OAuth flow and state mismatch error.
- `apps/mobile/vitest.config.ts` — added `@` alias resolution for Vitest.

### Tests
- Task-specific: 5 passed, 0 failed (`npm --prefix apps/mobile test -- src/api/secure-store.test.ts src/api/auth.test.ts`)
- Regression: 5 passed, 0 failed (`npm --prefix apps/mobile test`)

### Acceptance Criteria
- [x] AC-1: `kotel://auth/callback?code=...&state=...` opens the app — verified by: code inspection (`scheme: "kotel"` and fixed redirect URI in auth flow).
- [x] AC-2: OAuth flow system browser -> login -> callback -> tokens works — verified by: `src/api/auth.test.ts` happy-path test.
- [x] AC-3: Tokens stored in secure store — verified by: `src/api/secure-store.ts` implementation and `src/api/secure-store.test.ts`.
- [x] AC-4: State mismatch returns error — verified by: `src/api/auth.test.ts` mismatch test.
- [x] AC-5: PKCE verification passes on backend — verified by: auth flow sends `code_challenge_method=S256` and exchanges with `{ code, codeVerifier }` in tested request payload.
- [x] AC-6: User info fetched with Bearer token — verified by: `src/api/auth.test.ts` assertion for `Authorization: Bearer ...` on `/api/session/status`.

### Discoveries
- For mobile package tests, Vitest needs explicit alias mapping (`@` -> app root) via local `vitest.config.ts`; otherwise TS path imports fail in test runtime.
