# Step 17: Frontend — per-server axios instances with auth-refresh

## Goal
Create an axios instance factory that produces per-server HTTP clients with automatic 401 → refresh → retry via `axios-auth-refresh`.

## Motivation
Each server has its own cookies and tokens. A per-server axios instance ensures requests go to the correct server with the correct credentials. The auth-refresh interceptor handles transparent token renewal.

## Type
feature, ui

## Affected Area
- `apps/frontend/src/api/create-server-client.ts` — new file
- `apps/frontend/package.json` — add `axios-auth-refresh` dependency

## Dependencies
Depends on Step 16 (multi-server store) and Step 09 (backend refresh endpoint).

## Current Behavior
No per-server axios instances. The old global axios was removed in Step 03.

## Expected Behavior

### Install dependency

```bash
npm install axios-auth-refresh
```

### Per-server client factory (`api/create-server-client.ts`)

```typescript
import axios, { type AxiosInstance } from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';

const clients = new Map<string, AxiosInstance>();

export function getServerClient(serverUrl: string): AxiosInstance {
  if (clients.has(serverUrl)) return clients.get(serverUrl)!;

  const instance = axios.create({
    baseURL: serverUrl,
    withCredentials: true,
  });

  const refreshLogic = async () => {
    await instance.post('/api/session/refresh', {});
    // Cookie updated by server — browser handles it
  };

  createAuthRefreshInterceptor(instance, refreshLogic);
  clients.set(serverUrl, instance);
  return instance;
}

export function removeServerClient(serverUrl: string): void {
  clients.delete(serverUrl);
}
```

### Integration with store

When `removeServer` is called (Step 16), also call `removeServerClient(serverUrl)` to clean up the axios instance.

### Usage pattern

All API calls to a specific server go through `getServerClient(serverUrl)`:
```typescript
const client = getServerClient('https://kotel.localhost');
const response = await client.get('/api/session/status');
```

## Specification

1. Install `axios-auth-refresh` in `apps/frontend/`.
2. Create `api/create-server-client.ts`.
3. Integrate cleanup with `removeServer` from Step 16.
4. Update `exchangeCode` in `api/auth.ts` to use the per-server client for the status check after code exchange.

## Acceptance Criteria
1. `getServerClient(url)` returns an axios instance with `baseURL` and `withCredentials: true`.
2. Same URL returns the same cached instance.
3. On 401, `axios-auth-refresh` calls `POST /api/session/refresh` and retries the original request.
4. `removeServerClient` clears the cached instance.
5. Multiple servers have independent axios instances.

## Verification Scenario
1. Add a server via OAuth flow.
2. Make a request with expired access token.
3. Observe: 401 → automatic refresh → retry → success (transparent to caller).

## Testing
E2E Playwright tests in Step 27.

## Notes
- `axios-auth-refresh` queues concurrent 401 requests and refreshes only once. This handles the case where multiple API calls fail simultaneously.
- `withCredentials: true` ensures cookies are sent cross-origin (combined with server's CORS config from Step 03).
- The SharedWorker (Step 18) will later replace the direct refresh call with worker delegation for cross-tab coordination.
