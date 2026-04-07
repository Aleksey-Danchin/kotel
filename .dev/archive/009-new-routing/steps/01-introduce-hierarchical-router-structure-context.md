---

## step-imp — 2026-04-06T12:59:03+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/state/routePath.ts` — replaced flat selection-id parsing with hierarchical route parser (`index`, `server`, `server-chat`, `config`, `config-server`)
- `apps/designer/src/state/routePath.test.ts` — added tests for config precedence and hierarchical route parsing
- `apps/designer/src/state/store.ts` — migrated `routeContextAtom` and selected server/chat resolution to hierarchical route context
- `apps/designer/src/routes/~__root.tsx` — switched pathname handling and Escape navigation behavior to hierarchical route parsing
- `apps/designer/src/state/designerNavigation.ts` — updated typed navigation targets to `/$serverId` and `/$serverId/$chatId`, adjusted last-chat cleanup logic
- `apps/designer/src/state/designerNavigation.test.ts` — updated cleanup tests for server/chat hierarchical paths
- `apps/designer/src/routes/~setup/~index.tsx` — updated navigate target to `/$serverId`
- `apps/designer/src/routes/~session-test/~index.tsx` — updated navigate target to `/$serverId`
- `apps/designer/src/state/store.test.ts` — updated route context fixture to new `server` context shape
- `apps/designer/src/routes/~$serverId/~index.tsx` — new explicit server-only route
- `apps/designer/src/routes/~$serverId/~$chatId/~index.tsx` — new explicit server+chat route (chat shell body)
- `apps/designer/src/routes/~config/~index.tsx` — new explicit configurator root route
- `apps/designer/src/routes/~config/~$serverId/~index.tsx` — new explicit configurator+server route
- `apps/designer/src/global/routeTree.gen.ts` — regenerated route tree with explicit hierarchical routes
- `apps/designer/src/routes/~$id/~index.tsx` — removed legacy single dynamic route file

### Tests
- Task-specific: 14 passed, 0 failed (`src/state/routePath.test.ts`, `src/state/designerNavigation.test.ts`, `src/state/store.test.ts`)
- Regression: full `npm test` run completed with 5 pre-existing failures in unrelated suites (`chatThreadScrollLogic`, `chatMessageTimeline`, `store.sessions`)

### Acceptance Criteria
- [x] AC-1: explicit routes for `/`, `/:serverId`, `/:serverId/:chatId`, `/config`, `/config/:serverId` — verified by regenerated `routeTree.gen.ts` and targeted tests
- [x] AC-2: legacy route no longer primary contract — verified by removing `~$id/~index.tsx` and updating navigation helpers
- [x] AC-3: static routes keep exact resolution — verified by `resolveDesignerRoutePath` tests for `/setup`, `/users`, `/session-test`, `/callback`
- [x] AC-4: TypeScript route types compile for new route definitions — verified by `npx tsc -b --pretty false` (only unrelated pre-existing skeleton errors remain)

### Discoveries
- `apps/designer` route tree regeneration works via `npx @tanstack/router-cli generate`; this updates `src/global/routeTree.gen.ts` after route file structure changes.
