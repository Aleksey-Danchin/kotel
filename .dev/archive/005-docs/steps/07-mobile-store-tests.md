# Step 07: Add unit tests for mobile state/servers.ts

## Goal

Write Vitest unit tests for `apps/mobile/src/state/servers.ts`, covering the three exported Jotai atoms: `serversAtom`, `activeServerUrlAtom`, and derived `activeServerSessionAtom`.

## Motivation

The frontend has analogous tests for `apps/frontend/src/state/servers.ts` (in `servers.test.ts`). The mobile state module has no tests. It follows the same Jotai atom pattern and should be covered for the same reasons: catching regressions in derived state and mutation logic.

## Type

frontend (mobile unit tests)

## Affected Area

- `apps/mobile/src/state/servers.test.ts` — new test file

## Dependencies

None.

## Current Behavior

`apps/mobile/src/state/servers.ts` exports:

```ts
import { atom } from "jotai";

export type MobileServerUser = {
  id: string;
  fullname: string;
  role: string;
};

export type MobileServerSession = {
  serverUrl: string;
  sessionId: string;
  user: MobileServerUser;
};

export const serversAtom = atom<Map<string, MobileServerSession>>(new Map());
export const activeServerUrlAtom = atom<string | null>(null);

export const activeServerSessionAtom = atom((get) => {
  const activeServerUrl = get(activeServerUrlAtom);
  if (!activeServerUrl) {
    return null;
  }
  return get(serversAtom).get(activeServerUrl) ?? null;
});
```

Unlike the frontend store, there is no `serversStore` singleton export or `resetServersStore` helper. Tests must create isolated Jotai stores using `createStore()` from `jotai`.

There is no test file for this module.

## Expected Behavior

A `servers.test.ts` file exists in `apps/mobile/src/state/` that tests all atom behaviors.

## Specification

Create `apps/mobile/src/state/servers.test.ts`:

```ts
import { createStore } from "jotai";
import { describe, it, expect } from "vitest";
import {
  serversAtom,
  activeServerUrlAtom,
  activeServerSessionAtom,
  type MobileServerSession,
} from "./servers";
```

Use `createStore()` in each test or `beforeEach` to get a fresh isolated store:

```ts
const store = createStore();
store.set(serversAtom, new Map());
store.set(activeServerUrlAtom, null);
```

### Test cases

**1. serversAtom — initial state is an empty Map**
- `store.get(serversAtom)` returns a `Map` with size 0.

**2. serversAtom — add a session**
- Set `serversAtom` to a Map with one entry (serverUrl → MobileServerSession).
- `store.get(serversAtom).get(serverUrl)` returns the session.

**3. serversAtom — add two sessions for different serverUrls**
- Both entries are retrievable independently.
- Map has size 2.

**4. serversAtom — remove a session (immutable update pattern)**
- Start with two sessions.
- Create a new Map without one key, set it.
- The removed serverUrl is no longer in the Map.
- The other session is still present.

**5. activeServerUrlAtom — initial value is null**
- `store.get(activeServerUrlAtom)` is `null`.

**6. activeServerUrlAtom — set and read**
- `store.set(activeServerUrlAtom, "https://server.example")`.
- `store.get(activeServerUrlAtom)` returns `"https://server.example"`.

**7. activeServerSessionAtom — returns null when activeServerUrlAtom is null**
- Both atoms at initial state.
- `store.get(activeServerSessionAtom)` is `null`.

**8. activeServerSessionAtom — returns null when activeServerUrl is set but not in serversAtom**
- Set `activeServerUrlAtom` to a URL that is not a key in `serversAtom`.
- `store.get(activeServerSessionAtom)` is `null`.

**9. activeServerSessionAtom — returns the correct session when active URL is in serversAtom**
- Add a session for `serverUrl` to `serversAtom`.
- Set `activeServerUrlAtom` to that `serverUrl`.
- `store.get(activeServerSessionAtom)` returns the correct `MobileServerSession`.

**10. activeServerSessionAtom — returns null after removing the active server from serversAtom**
- Start with session in map and active URL set.
- Remove that URL from the map.
- `store.get(activeServerSessionAtom)` is `null`.

### Test data helper

Define a factory function at the top of the test file:

```ts
function makeSession(serverUrl: string): MobileServerSession {
  return {
    serverUrl,
    sessionId: `session-${serverUrl}`,
    user: { id: "user-1", fullname: "Test User", role: "user" },
  };
}
```

## Acceptance Criteria

1. `apps/mobile/src/state/servers.test.ts` exists.
2. All 10 test cases are implemented and pass.
3. Each test uses an isolated `createStore()` instance — no shared mutable state between tests.
4. The tests run with the existing Vitest config in `apps/mobile/vitest.config.ts`.

## Verification Scenario

1. Run `cd apps/mobile && npx vitest run src/state/servers.test.ts`.
2. All 10 tests pass.

## Testing

Vitest unit tests. No Docker containers or mocking of native modules needed (the store is pure JS).

## Notes

- Jotai's `createStore()` creates a fully isolated store instance. Use it instead of `getDefaultStore()` to avoid cross-test contamination.
- The mobile `serversAtom` stores a `Map<string, MobileServerSession>`. When updating the map, create a new `Map` instance (Jotai atom equality check is by reference for objects).
- Compare with `apps/frontend/src/state/servers.test.ts` for reference on the testing pattern, but note that the mobile store has no localStorage persistence — no need to mock `localStorage`.
- Check `apps/mobile/vitest.config.ts` to confirm the test environment (likely `node` or `jsdom`) and adjust imports if needed.
