# Step 18: Frontend SharedWorker for refresh coordination

## Goal
Implement a SharedWorker that coordinates token refresh across browser tabs, preventing reuse detection from triggering when multiple tabs simultaneously get 401.

## Motivation
Without coordination, multiple tabs refreshing concurrently cause reuse detection: the first succeeds, the second sends an already-used token. SharedWorker provides a single execution context shared across all tabs.

## Type
feature, ui

## Affected Area
- `apps/frontend/src/workers/shared-refresh-worker.ts` — new file
- `apps/frontend/src/api/create-server-client.ts` — update refresh logic to delegate to worker
- `apps/frontend/vite.config.ts` — worker bundling config if needed
- `apps/frontend/tsconfig.app.json` — SharedWorker types if needed

## Dependencies
Depends on Step 17 (per-server axios with auth-refresh).

## Current Behavior
Each tab independently calls `POST /api/session/refresh`, which would cause reuse detection if tabs refresh simultaneously.

## Expected Behavior

### SharedWorker (`workers/shared-refresh-worker.ts`)

Single instance per origin, shared across tabs:

```typescript
const ports = new Set<MessagePort>();
const refreshing = new Map<string, Promise<boolean>>();

onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  port.start();
  ports.add(port);

  port.addEventListener('message', async (event) => {
    if (event.data.type === 'refresh') {
      const { serverUrl } = event.data;

      if (refreshing.has(serverUrl)) {
        const ok = await refreshing.get(serverUrl);
        port.postMessage({ type: ok ? 'refreshed' : 'refresh_failed', serverUrl });
        return;
      }

      const promise = doRefresh(serverUrl);
      refreshing.set(serverUrl, promise);
      const ok = await promise;
      refreshing.delete(serverUrl);

      const msg = { type: ok ? 'refreshed' : 'refresh_failed', serverUrl };
      ports.forEach(p => p.postMessage(msg));
    }
  });
};

async function doRefresh(serverUrl: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${serverUrl}/api/session/refresh`, {
      method: 'POST', credentials: 'include', signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}
```

### Updated refresh logic in `create-server-client.ts`

Replace direct refresh with worker delegation:

```typescript
function createRefreshLogic(serverUrl: string) {
  if (typeof SharedWorker === 'undefined') {
    // Fallback: direct refresh
    return async () => { await fetch(`${serverUrl}/api/session/refresh`, { method: 'POST', credentials: 'include' }); };
  }

  return () => new Promise<void>((resolve, reject) => {
    const worker = getSharedWorker();
    worker.port.postMessage({ type: 'refresh', serverUrl });

    function handler(e: MessageEvent) {
      if (e.data.serverUrl !== serverUrl) return;
      worker.port.removeEventListener('message', handler);
      e.data.type === 'refreshed' ? resolve() : reject(new Error('refresh failed'));
    }
    worker.port.addEventListener('message', handler);
  });
}
```

Worker instantiation: `new SharedWorker(new URL('../workers/shared-refresh-worker.ts', import.meta.url), { type: 'module' })`.

## Specification

1. Create `workers/shared-refresh-worker.ts`.
2. Update `create-server-client.ts` to use SharedWorker for refresh.
3. Add fallback for browsers without SharedWorker support.
4. Configure Vite/tsconfig if needed for worker bundling and types.

## Acceptance Criteria
1. SharedWorker shared across all tabs.
2. Concurrent 401s from multiple tabs → only ONE refresh request sent.
3. Multiple servers refresh independently.
4. Fallback works in browsers without SharedWorker.

## Verification Scenario
1. Two tabs connected to same server.
2. Both get 401 simultaneously.
3. Network tab shows only one `POST /api/session/refresh`.
4. Both tabs resume.

## Testing
E2E Playwright tests in Step 27 (multi-tab scenario).

## Notes
- Worker uses `fetch` directly (not axios) — runs outside DOM.
- Vite handles `new URL(..., import.meta.url)` for worker bundling.
- Future: worker can also share a WebSocket connection (outside current scope).
