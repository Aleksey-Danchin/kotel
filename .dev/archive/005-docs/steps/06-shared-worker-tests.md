# Step 06: Add unit tests for SharedWorker

## Goal

Write Vitest unit tests for `apps/frontend/src/workers/shared-refresh-worker.ts` covering the deduplication logic, broadcast behavior, and error handling.

## Motivation

The SharedWorker is business-critical: it ensures that when multiple browser tabs simultaneously receive a `401`, only one refresh request is sent to the server. Without tests, regressions in this deduplication logic are silent. The SharedWorker is the only file in `apps/frontend/src/workers/` with no test coverage.

## Type

backend (frontend unit tests)

## Affected Area

- `apps/frontend/src/workers/shared-refresh-worker.test.ts` — new test file
- `apps/frontend/src/workers/shared-refresh-worker.ts` — may need minor refactoring to make internals testable (extract the port message handler)

## Dependencies

None.

## Current Behavior

`apps/frontend/src/workers/shared-refresh-worker.ts` is a SharedWorker entry point. Its logic:

```ts
const ports = new Set<MessagePort>();
const refreshing = new Map<string, Promise<boolean>>();
// ...
const context = self as unknown as SharedWorkerGlobalScope;
context.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  ports.add(port);
  port.start();
  port.addEventListener("message", async (messageEvent: MessageEvent) => {
    // if refreshing in-flight for this serverUrl: await it, respond to this port
    // else: start doRefresh, set in map, await, delete, broadcast
  });
};
```

The `doRefresh(serverUrl)` function does a `fetch` with a 20-second `AbortController` timeout.

The file has no test. Testing it directly is difficult because it references `self as SharedWorkerGlobalScope`.

## Expected Behavior

A `shared-refresh-worker.test.ts` file exists that imports and tests the core logic. All key behaviors are covered by unit tests that run with `vitest`.

## Specification

### Refactoring strategy

The current file exports nothing — all logic is wired to `context.onconnect`. To make it testable without a real SharedWorker environment, extract the core logic into exportable functions and import them in the test.

Add the following exports to `shared-refresh-worker.ts`:

```ts
// Export for testing — these are the pure logic units
export { doRefresh, handlePortMessage, initPort }
```

Or alternatively, extract a `createWorkerHandler(fetchImpl)` factory function that accepts a `fetch` implementation and returns the `onconnect` handler. The test injects a mock `fetch`.

The implementing agent should choose the extraction approach that minimizes changes to the existing module structure while making key behaviors testable. The `doRefresh` function can be tested in isolation by mocking `fetch`. The deduplication behavior (multiple ports, one in-flight request) requires a test harness that simulates two `MessagePort` objects sending "refresh" messages concurrently.

### Test cases to cover

Create `apps/frontend/src/workers/shared-refresh-worker.test.ts`:

**1. Single port — successful refresh**
- Port sends `{ type: "refresh", serverUrl: "https://server.example" }`.
- Mock `fetch` returns `{ ok: true }`.
- Port receives `{ type: "refreshed", serverUrl: "https://server.example" }`.

**2. Single port — failed refresh (non-ok response)**
- Mock `fetch` returns `{ ok: false }`.
- Port receives `{ type: "refresh_failed", serverUrl: "..." }`.

**3. Single port — refresh throws (network error)**
- Mock `fetch` throws.
- Port receives `{ type: "refresh_failed", serverUrl: "..." }`.

**4. Deduplication — two ports, same serverUrl, concurrent requests**
- Two ports both send `{ type: "refresh", serverUrl: "https://server.example" }` before the first resolves.
- Mock `fetch` is called exactly **once**.
- Both ports receive the result (`refreshed` or `refresh_failed`).

**5. Isolation — two ports, different serverUrls**
- Port A sends refresh for `https://server-a.example`.
- Port B sends refresh for `https://server-b.example`.
- Mock `fetch` is called **twice** (once per serverUrl).
- Each port receives the correct result for its own serverUrl.

**6. Invalid message ignored**
- Port sends a message that is not a valid `RefreshRequestMessage` (e.g. `{ type: "unknown" }`).
- No `fetch` is called. No response is sent.

**7. Timeout — doRefresh exceeds 20s**
- Mock `fetch` never resolves (hangs).
- After advancing fake timers by 20s, `doRefresh` returns `false`.
- Port receives `{ type: "refresh_failed", serverUrl: "..." }`.
- Use `vi.useFakeTimers()` for this test.

### MessagePort mock

Create a minimal mock for `MessagePort` in the test file:

```ts
function createMockPort() {
  const messages: unknown[] = [];
  const listeners: ((event: MessageEvent) => void)[] = [];
  return {
    postMessage(data: unknown) { messages.push(data); },
    addEventListener(_: "message", handler: (e: MessageEvent) => void) {
      listeners.push(handler);
    },
    start() {},
    // helper: simulate incoming message
    emit(data: unknown) {
      listeners.forEach(fn => fn(new MessageEvent("message", { data })));
    },
    messages,
  };
}
```

### Vitest config

Frontend Vitest config is in `apps/frontend/vitest.config.ts`. SharedWorker tests run in the jsdom or node environment. If the worker uses `fetch`, ensure `vi.stubGlobal("fetch", mockFetch)` is used.

## Acceptance Criteria

1. `apps/frontend/src/workers/shared-refresh-worker.test.ts` exists.
2. All 7 test cases listed above are implemented and pass with `vitest`.
3. The deduplication test (case 4) verifies `fetch` is called exactly once when two ports request the same serverUrl concurrently.
4. The existing `shared-refresh-worker.ts` behavior is unchanged (no functional regression).
5. Tests run cleanly in the existing Vitest config without new dependencies.

## Verification Scenario

1. Run `cd apps/frontend && npx vitest run src/workers/shared-refresh-worker.test.ts`.
2. All tests pass.
3. Deduplication test output confirms `fetch` was called once.

## Testing

Vitest unit tests. No Docker containers needed for this step.

## Notes

- The SharedWorker uses a `Map<string, Promise<boolean>>` (`refreshing`) for deduplication — test that the in-flight promise is shared, not duplicated.
- `doRefresh` uses `AbortController` with `setTimeout(20_000)` — use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync` for the timeout test.
- If the refactoring to make the worker testable requires adding exports, use named exports at the bottom of the file (`export { doRefresh }`) so the worker still works as an entry point when bundled.
- The test file must use `vi.stubGlobal("fetch", ...)` for fetch mocking, not `global.fetch = ...`, to avoid global state leakage between tests.
