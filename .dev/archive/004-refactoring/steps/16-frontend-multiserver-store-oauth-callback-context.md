---

## step-imp — 2026-03-23T17:41:35+03:00

**Result**: SUCCESS

### Changed Files
- `apps/frontend/src/state/servers.ts` — added Jotai multi-server store with atoms and immutable add/remove helpers backed by a dedicated store.
- `apps/frontend/src/api/auth.ts` — implemented OAuth PKCE popup flow, callback message handling, code exchange, session fetch, and store integration.
- `apps/frontend/src/routes/~callback.tsx` — added callback route that posts `code/state` to opener and closes popup.
- `apps/frontend/src/main.tsx` — initialized OAuth postMessage listener on app startup.
- `apps/frontend/src/state/servers.test.ts` — added unit tests for immutable multi-server state updates and active server behavior.
- `apps/frontend/src/api/auth.test.ts` — added unit tests for popup flow success, state mismatch rejection, multi-server independence, and cleanup on removal.

### Tests
- Task-specific: 6 passed, 0 failed (`docker exec kris-frontend-test npx vitest run src/state/servers.test.ts src/api/auth.test.ts`)
- Regression: 6 passed, 0 failed (`docker exec kris-frontend-test npm test`)

### Acceptance Criteria
- [x] AC-1: `addServer('https://kotel.localhost')` opens OAuth popup — verified by: unit test `src/api/auth.test.ts`.
- [x] AC-2: callback posts `code+state` and popup closes — verified by: callback route implementation inspection + successful flow test.
- [x] AC-3: main window exchanges code, fetches user, adds store entry — verified by: unit test `src/api/auth.test.ts`.
- [x] AC-4: `serversAtom` contains new server entry — verified by: unit tests `src/api/auth.test.ts` and `src/state/servers.test.ts`.
- [x] AC-5: state mismatch rejects with error — verified by: unit test `src/api/auth.test.ts`.
- [x] AC-6: multiple servers can be added independently — verified by: unit test `src/api/auth.test.ts`.

### Discoveries
- Frontend build (`npm run build`) was used as additional verification to ensure TanStack Router picked up the new `/callback` route entry in generated artifacts.
