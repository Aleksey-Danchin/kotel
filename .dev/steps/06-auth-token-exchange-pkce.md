# Step 06: Auth module — POST /auth/token (code exchange, PKCE, session creation)

## Goal
Implement the `POST /api/auth/token` endpoint that exchanges an authorization code for access and refresh tokens, with PKCE verification and session record creation.

## Motivation
This is the OAuth token endpoint — the second half of the authorization flow. The client sends the authorization code and the PKCE code_verifier; the server verifies the proof, creates a session, and delivers tokens.

## Type
feature, backend

## Affected Area
- `apps/backend/src/auth/auth.controller.ts` — add token exchange endpoint
- `apps/backend/src/auth/auth.service.ts` — add exchange logic

## Dependencies
Depends on Step 05 (CodeStore and login endpoint generate codes) and Step 04 (token utils, cookie constants, contracts).

## Current Behavior
`POST /api/auth/token` does not exist. The CodeStore from Step 05 stores authorization codes, but nothing consumes them yet.

## Expected Behavior

### `POST /api/auth/token`

Public endpoint (no auth required). Request body validated with `tokenExchangeSchema`.

**Algorithm:**

1. Validate body with Zod. Invalid → 400.
2. Consume code from CodeStore. Not found / expired → 400 `{ message: "Invalid or expired code" }`.
3. **PKCE verification**: compute `SHA256(codeVerifier)` in base64url encoding, compare with stored `codeChallenge`.
   ```typescript
   const computed = createHash('sha256')
     .update(dto.codeVerifier)
     .digest('base64url');
   if (computed !== storedEntry.codeChallenge) → 400 "PKCE verification failed"
   ```
4. Generate access token and refresh token via `generateToken()`.
5. Hash both via `hashToken()`.
6. Calculate expiry timestamps:
   - `accessTokenExpiresAt = now + getAccessTokenTtlSeconds() * 1000`
   - `refreshTokenExpiresAt = now + getRefreshTokenTtlSeconds() * 1000`
7. Generate a `sessionId` (logical chain grouper): `cuid()` or `randomUUID()`.
8. Extract fingerprint from `storedEntry.redirectUri` — the origin portion (e.g., `https://kotel.localhost` from `https://kotel.localhost/callback`).
9. Create `Session` record in the database via Prisma:
   ```
   { id: cuid(), accessTokenHash, refreshTokenHash, sessionId,
     userId: storedEntry.userId, clientType: storedEntry.clientType,
     fingerprint, status: ACTIVE, prevSessionId: null,
     accessTokenExpiresAt, refreshTokenExpiresAt }
   ```
10. **Response depends on clientType:**
    - **WEB**: Set `accessToken` cookie (options from `getAccessTokenCookieOptions()`), set `refreshToken` cookie (options from `getRefreshTokenCookieOptions()`). Return JSON: `{ sessionId }`.
    - **EXPO**: Return JSON: `{ accessToken, refreshToken, sessionId }`.

### Response object access to Express `Response`

Use `@Res({ passthrough: true }) response: Response` to set cookies while still returning JSON through NestJS.

## Specification

1. Add `POST /auth/token` method to `AuthController`.
2. Implement `exchangeCode(dto: TokenExchangeDto, response: Response)` in `AuthService`.
3. PKCE verification uses `crypto.createHash('sha256').update(codeVerifier).digest('base64url')`.
4. Session creation via `this.prismaService.client.session.create(...)`.
5. Cookie setting via `response.cookie(...)`.
6. Fingerprint extraction: `new URL(redirectUri).origin`.

## Acceptance Criteria
1. Valid `code` + `codeVerifier` → session created in DB, tokens delivered.
2. WEB client: tokens in httpOnly cookies, JSON body has `sessionId` only.
3. EXPO client: tokens in JSON body (`accessToken`, `refreshToken`, `sessionId`).
4. Invalid `codeVerifier` (PKCE mismatch) → 400.
5. Expired code → 400.
6. Code reuse (second exchange attempt) → 400.
7. Session record in DB has correct `accessTokenHash`, `refreshTokenHash`, `sessionId`, `clientType`, `fingerprint`, `status=ACTIVE`.
8. Cookie options: `httpOnly`, `secure`, `sameSite=none`, correct paths.

## Verification Scenario
1. Complete login flow from Step 05 to get a `code`.
2. Call `POST /api/auth/token` with `{ code, codeVerifier }`.
3. For WEB: check response cookies with browser DevTools — `accessToken` and `refreshToken` present with correct paths.
4. Query database: session record exists with hashed tokens.
5. Try same code again → 400.

## Testing
Unit tests in Step 24.

## Notes
- PKCE digest must use `base64url` encoding (not `hex`, not `base64`). This is what RFC 7636 specifies and what clients generate.
- The `fingerprint` is the origin of `redirect_uri`, not the full URL. `new URL("https://kotel.localhost/callback").origin` → `"https://kotel.localhost"`.
- The `sessionId` is a logical grouper for the rotation chain. The first session in a chain gets a fresh `sessionId`. Subsequent rotations (Step 09) reuse the same `sessionId`.
