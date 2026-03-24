# Step 16: Frontend — multi-server store, OAuth popup flow, callback page

## Goal
Create the multi-server Jotai store, implement the OAuth popup flow with PKCE + state, and add the `/callback` route that receives authorization codes from the popup.

## Motivation
This is the client-side implementation of the OAuth 2.0 flow. The frontend must support connecting to multiple independent servers, each via its own OAuth popup.

## Type
feature, ui

## Affected Area
- `apps/frontend/src/state/servers.ts` — new file (multi-server Jotai atoms)
- `apps/frontend/src/api/auth.ts` — new file (OAuth flow functions)
- `apps/frontend/src/routes/~callback.tsx` — new TanStack Router route

## Dependencies
Depends on Steps 05-06 (backend auth endpoints: login page + token exchange).

## Current Behavior
No OAuth flow. No multi-server support. Old session state deleted in Step 03.

## Expected Behavior

### Multi-server Jotai store (`state/servers.ts`)

```typescript
type ServerSession = {
  serverUrl: string;
  sessionId: string;
  user: { id: string; fullname: string; login: string; role: string };
};

const serversAtom = atom<Map<string, ServerSession>>(new Map());
const activeServerUrlAtom = atom<string | null>(null);
const activeSessionAtom = atom((get) => {
  const url = get(activeServerUrlAtom);
  return url ? get(serversAtom).get(url) ?? null : null;
});
```

Helper functions to add/remove servers (update the Map immutably).

### OAuth flow (`api/auth.ts`)

**`addServer(serverUrl: string)`**:
1. Generate PKCE pair using Web Crypto API:
   - `codeVerifier`: `crypto.getRandomValues(new Uint8Array(64))` → base64url
   - `codeChallenge`: `crypto.subtle.digest('SHA-256', codeVerifier)` → base64url
2. Generate state: `crypto.randomUUID()`.
3. Store in `sessionStorage`: `oauth_state_${serverUrl}`, `oauth_verifier_${serverUrl}`.
4. Build auth URL: `${serverUrl}/api/auth/login?redirect_uri=${origin}/callback&code_challenge=...&code_challenge_method=S256&state=...`.
5. Open popup: `window.open(authUrl, 'auth', 'width=500,height=600')`.
6. Return a Promise that resolves when the popup completes.

**postMessage listener**:
```typescript
window.addEventListener('message', async (event) => {
  if (event.origin !== window.location.origin) return;
  if (!event.data.code || !event.data.state) return;
  // Match state to a pending server flow
  // Verify state, retrieve codeVerifier from sessionStorage
  // Exchange code for tokens
  // Fetch user info via GET /api/session/status
  // Add to store
});
```

**`exchangeCode(serverUrl, code, codeVerifier)`**:
```typescript
await fetch(`${serverUrl}/api/auth/token`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, codeVerifier }),
});
```

**`removeServer(serverUrl)`**: Remove from store, clear related sessionStorage.

### Callback page (`routes/~callback.tsx`)

Minimal TanStack Router route:
```typescript
export const Route = createFileRoute('/callback')({ component: CallbackPage });

function CallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state && window.opener) {
      window.opener.postMessage({ code, state }, window.location.origin);
      window.close();
    }
  }, []);
  return <p>Processing authentication...</p>;
}
```

## Specification

1. Create `state/servers.ts` with atoms and helper functions.
2. Create `api/auth.ts` with `addServer`, `exchangeCode`, `removeServer`, postMessage listener.
3. Create `routes/~callback.tsx`.
4. TanStack Router auto-generates route tree on file creation.

## Acceptance Criteria
1. `addServer('https://kotel.localhost')` opens a popup with the server's login page.
2. After login, popup redirects to `/callback`, posts code+state, closes.
3. Main window exchanges code, fetches user info, adds to store.
4. `serversAtom` contains the new server entry.
5. State mismatch → exchange rejected, error thrown.
6. Multiple servers can be added independently.

## Verification Scenario
1. Call `addServer('https://kotel.localhost')` from browser console or UI.
2. Popup opens → login → popup closes.
3. Check Jotai store → server entry present.

## Testing
E2E Playwright tests in Step 27.

## Notes
- `credentials: 'include'` is required for cross-origin cookie delivery on the token exchange request.
- `sessionStorage` is tab-scoped — safe for concurrent OAuth flows.
- If popup is blocked by browser, the Promise should reject with a descriptive error.
