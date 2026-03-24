# Step 22: Mobile — multi-server store and per-server axios client

## Goal
Create the mobile multi-server Jotai store and per-server axios instances with Bearer-based auth-refresh using tokens from secure store.

## Motivation
Same multi-server architecture as web, but with Bearer tokens instead of cookies. Each server's tokens are stored in expo-secure-store and attached as Authorization headers.

## Type
feature, mobile

## Affected Area
- `apps/mobile/src/state/servers.ts` — new file
- `apps/mobile/src/api/create-server-client.ts` — new file
- `apps/mobile/src/api/http-client.ts` — delete or replace
- `apps/mobile/src/config/api-config.ts` — delete or replace
- `apps/mobile/package.json` — add `axios-auth-refresh`

## Dependencies
Depends on Step 21 (secure store, auth flow).

## Current Behavior
Old single-server config with one axios instance. Old session atoms removed in Step 03.

## Expected Behavior

### Multi-server store (`state/servers.ts`)

Same pattern as frontend (Step 16), but adapted for React Native + Jotai:

```typescript
type MobileServerSession = {
  serverUrl: string;
  sessionId: string;
  user: { id: string; fullname: string; login: string; role: string };
};

const serversAtom = atom<Map<string, MobileServerSession>>(new Map());
const activeServerUrlAtom = atom<string | null>(null);
```

Persisted to AsyncStorage (optional, can be added later).

### Per-server axios client (`api/create-server-client.ts`)

Key difference from web: **Bearer token** instead of cookies.

```typescript
import axios from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './secure-store';

export function getServerClient(serverUrl: string): AxiosInstance {
  // ... cached instances Map ...

  const instance = axios.create({ baseURL: serverUrl });

  // Request interceptor: attach Bearer token
  instance.interceptors.request.use(async (config) => {
    const token = await getAccessToken(serverUrl);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Refresh interceptor
  const refreshLogic = async () => {
    const refreshToken = await getRefreshToken(serverUrl);
    if (!refreshToken) throw new Error('No refresh token');

    const response = await axios.post(
      `${serverUrl}/api/session/refresh`,
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    );

    const { accessToken: newAccess, refreshToken: newRefresh } = response.data;
    await saveTokens(serverUrl, newAccess, newRefresh);
  };

  createAuthRefreshInterceptor(instance, refreshLogic);
  return instance;
}
```

### Cleanup old files

- Delete `apps/mobile/src/api/http-client.ts` (old single-server client).
- Delete `apps/mobile/src/config/api-config.ts` (old API config).

## Specification

1. Install `axios-auth-refresh` in `apps/mobile/`.
2. Create `state/servers.ts`.
3. Create `api/create-server-client.ts` with Bearer interceptors.
4. Delete old HTTP client and config.
5. Verify compilation.

## Acceptance Criteria
1. Per-server axios instances with Bearer auth.
2. Access token attached to every request.
3. On 401: refresh token sent as Bearer, new tokens saved to secure store.
4. Old http-client and api-config files deleted.
5. Mobile project compiles.

## Verification Scenario
1. Add server via OAuth.
2. Make API request → Bearer header present.
3. Wait for access token expiry → automatic refresh with new tokens.

## Testing
Manual testing on device/emulator.

## Notes
- Mobile refresh sends `refreshToken` as Bearer header (not cookie), consistent with EXPO client type.
- Backend returns new tokens in body for EXPO clients (Step 09).
- No SharedWorker needed — mobile is single-process.
