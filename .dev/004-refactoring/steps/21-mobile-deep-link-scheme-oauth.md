# Step 21: Mobile — deep link scheme, OAuth flow, secure token storage

## Goal
Configure the `kotel://` deep link scheme, implement the OAuth Authorization Code + PKCE flow using system browser, and store tokens securely with `expo-secure-store`.

## Motivation
Mobile OAuth flow differs from web: no popup, uses system browser with deep-link callback. Tokens are stored in the device keychain (not cookies). The `kotel://auth/callback` scheme receives the authorization code.

## Type
feature, mobile

## Affected Area
- `apps/mobile/app.json` — change `scheme` from `"mobile"` to `"kotel"`
- `apps/mobile/package.json` — add `expo-secure-store` dependency
- `apps/mobile/src/api/auth.ts` — new file (OAuth flow)
- `apps/mobile/src/api/secure-store.ts` — new file (token storage wrapper)

## Dependencies
Depends on Steps 05-06 (backend auth endpoints).

## Current Behavior
- `app.json` has `scheme: "mobile"`.
- No OAuth flow.
- No secure storage.

## Expected Behavior

### Deep link scheme

In `app.json`:
```json
{ "expo": { "scheme": "kotel" } }
```

This makes `kotel://auth/callback` available as a redirect URI.

### Install dependency

```bash
npx expo install expo-secure-store
```

### Secure token storage (`api/secure-store.ts`)

Wrapper around `expo-secure-store`:

```typescript
import * as SecureStore from 'expo-secure-store';

export async function saveTokens(serverUrl: string, accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(`${serverUrl}_accessToken`, accessToken);
  await SecureStore.setItemAsync(`${serverUrl}_refreshToken`, refreshToken);
}

export async function getAccessToken(serverUrl: string): Promise<string | null> {
  return SecureStore.getItemAsync(`${serverUrl}_accessToken`);
}

export async function getRefreshToken(serverUrl: string): Promise<string | null> {
  return SecureStore.getItemAsync(`${serverUrl}_refreshToken`);
}

export async function clearTokens(serverUrl: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${serverUrl}_accessToken`);
  await SecureStore.deleteItemAsync(`${serverUrl}_refreshToken`);
}
```

### OAuth flow (`api/auth.ts`)

**`addMobileServer(serverUrl: string)`**:
1. Generate PKCE pair:
   - `codeVerifier`: `expo-crypto` or `react-native-get-random-values` + `base64url`.
   - `codeChallenge`: SHA-256 of `codeVerifier` → base64url.
2. Generate state: random UUID.
3. Build auth URL: `${serverUrl}/api/auth/login?redirect_uri=kotel://auth/callback&code_challenge=...&code_challenge_method=S256&state=...`.
4. Open system browser via `expo-web-browser`:
   ```typescript
   import * as WebBrowser from 'expo-web-browser';
   const result = await WebBrowser.openAuthSessionAsync(authUrl, 'kotel://auth/callback');
   ```
5. Extract `code` and `state` from the callback URL.
6. Verify state matches.
7. Exchange code: `POST ${serverUrl}/api/auth/token { code, codeVerifier }`.
8. Response body: `{ accessToken, refreshToken, sessionId }` (EXPO client gets tokens in body).
9. Store tokens via `saveTokens(serverUrl, accessToken, refreshToken)`.
10. Fetch user info: `GET ${serverUrl}/api/session/status` with `Authorization: Bearer ${accessToken}`.
11. Return session data.

## Specification

1. Update `app.json` scheme.
2. Install `expo-secure-store`.
3. Create `api/secure-store.ts`.
4. Create `api/auth.ts` with full OAuth flow.
5. Verify deep link handling works with Expo.

## Acceptance Criteria
1. `kotel://auth/callback?code=...&state=...` opens the app.
2. OAuth flow: system browser → login → callback → tokens received.
3. Tokens stored in secure store (not AsyncStorage, not memory).
4. State mismatch → error.
5. PKCE verification passes on backend.
6. User info fetched with Bearer token.

## Verification Scenario
1. Call `addMobileServer('https://kotel.localhost')`.
2. System browser opens login page.
3. Login → redirect back to app.
4. Tokens in secure store, user info available.

## Testing
Manual testing on device/emulator.

## Notes
- `expo-web-browser` closes automatically after redirect.
- `expo-secure-store` uses Keychain (iOS) and Keystore (Android).
- The backend detects EXPO client from `redirect_uri` not starting with `https://` and returns tokens in body (not cookies).
- `expo-web-browser` requires `expo-linking` to handle the deep link.
