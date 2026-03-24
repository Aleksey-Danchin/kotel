# Step 20: Frontend — session test page, setup page, logout retry queue

## Goal
Create the session test page for manual OAuth testing, the first-run setup page, and the logout retry queue for offline resilience.

## Motivation
The test page is the primary manual testing tool during development. The setup page handles new server initialization. The retry queue handles edge cases where logout fails due to network issues.

## Type
feature, ui

## Affected Area
- `apps/frontend/src/routes/~session-test.tsx` — new file
- `apps/frontend/src/routes/~setup.tsx` — new file
- `apps/frontend/src/api/logout.ts` — new file (logout + retry queue)

## Dependencies
Depends on Step 16 (store, addServer), Step 17 (per-server axios), Step 19 (sidebar layout), Step 14 (backend setup endpoints).

## Current Behavior
No test page (deleted in Step 03). No setup page. No logout retry queue.

## Expected Behavior

### Session test page (`routes/~session-test.tsx`)

Manual testing interface:

- **Server URL input + "Add server" button** — calls `addServer()`, opens OAuth popup.
- **Connected servers list** — each server shows:
  - Server URL, user info, role
  - "Check status" button → `GET /api/session/status` via per-server axios
  - "Logout" button → calls `logout(serverUrl, false)`
  - "Logout all devices" button → calls `logout(serverUrl, true)`
  - "Force refresh" button → manually triggers `POST /api/session/refresh`
- **Raw state display** — JSON dump of `serversAtom` for debugging.

Styling: DaisyUI components. Similar layout to the old session-test page.

### Setup page (`routes/~setup.tsx`)

For first-run server initialization:

1. Input field for server URL.
2. "Check availability" button → `GET ${serverUrl}/api/setup/status`.
3. If `available: true`:
   - Show registration form: login, password, fullname.
   - Submit → `POST ${serverUrl}/api/setup/init`.
   - On success: "Root user created. You can now add this server." with "Add server" button.
4. If `available: false`:
   - Show "Server already configured. Go to login."

No auth required — setup endpoints are public.

### Logout with retry queue (`api/logout.ts`)

```typescript
const logoutQueue: Array<{ serverUrl: string; allDevices: boolean }> = [];

export async function logout(serverUrl: string, allDevices = false): Promise<void> {
  const client = getServerClient(serverUrl);
  try {
    await client.post('/api/session/logout', { allDevices });
  } catch {
    logoutQueue.push({ serverUrl, allDevices });
    if (allDevices) {
      // Show warning (AUTH_DESIGN.md requirement)
      // Implementation: alert, toast, or UI notification
    }
  } finally {
    removeServer(serverUrl);
    removeServerClient(serverUrl);
  }
}

// Flush on network reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const items = logoutQueue.splice(0);
    for (const item of items) {
      fetch(`${item.serverUrl}/api/session/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allDevices: item.allDevices }),
      }).catch(() => logoutQueue.push(item));
    }
  });
}
```

## Specification

1. Create `routes/~session-test.tsx` with all testing functions.
2. Create `routes/~setup.tsx` with server URL input and registration form.
3. Create `api/logout.ts` with retry queue.
4. Integrate logout function into sidebar disconnect and test page buttons.
5. Regenerate route tree.

## Acceptance Criteria
1. `/session-test` page shows server input, connected servers, action buttons.
2. All buttons trigger correct API calls.
3. Raw state display shows current store contents.
4. `/setup` page checks server availability and shows appropriate UI.
5. Setup form creates root user on fresh server.
6. Logout failure queues retry.
7. On network reconnect, queued logouts retried.
8. All-devices logout failure shows warning to user.

## Verification Scenario
1. Navigate to `/session-test`.
2. Add server → appears in list.
3. "Check status" → user info displayed.
4. "Logout" → server removed.
5. Navigate to `/setup`, enter fresh server URL → registration form shown.
6. Register → "Add server" button appears.

## Testing
E2E Playwright tests in Step 27.

## Notes
- The retry queue is in-memory — lost on tab close. AUTH_DESIGN.md acknowledges this limitation.
- The warning for all-devices logout failure can be a simple `alert()` for MVP, or a DaisyUI toast.
- The setup page uses direct `fetch()` (not per-server axios) because there's no server session yet.
