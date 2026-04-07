---

## step-imp — 2026-04-06T13:13:30Z

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/state/designerNavigation.ts` — added `/config` navigation target support and a resolver that opens `/config/:serverId` only when `activeServerIdAtom` points to an existing server.
- `apps/designer/src/components/ColumnHeaderGear.tsx` — switched gear action from modal-overlay atoms to route navigation (`/config` or `/config/:serverId`) while preserving source-driven tab initialization.
- `apps/designer/src/routes/~__root.tsx` — extracted and reused deterministic escape action resolver for chat/server exit transitions.
- `apps/designer/src/state/designerNavigation.test.ts` — expanded regression coverage for hierarchical navigation helpers and configurator target fallback behavior.
- `apps/designer/src/routes/~__root.test.ts` — added escape/back transition tests for route hierarchy behavior.

### Tests
- Task-specific: 15 passed, 0 failed
- Regression: 64 passed, 5 failed (pre-existing failures in `chatThreadScrollLogic.test.ts`, `chatMessageTimeline.test.ts`, `store.sessions.test.ts`)

### Acceptance Criteria
- [x] AC-1: No primary interaction uses legacy `/$id` paths — verified by: code inspection and updated navigation helper tests.
- [x] AC-2: Server/chat selections produce hierarchical URLs — verified by: `designerNavigation.test.ts`.
- [x] AC-3: Configurator open uses `activeServerId` fallback (`/config/:serverId` or `/config`) — verified by: `designerNavigation.test.ts` + `ColumnHeaderGear.tsx` wiring.
- [x] AC-4: Escape/back transitions match route hierarchy — verified by: `~__root.test.ts` and `~__root.tsx` logic.
- [x] AC-5: Regression tests cover new URL-model navigation flows — verified by: updated `designerNavigation.test.ts` and new `~__root.test.ts`.

### Discoveries
- `scripts/prettier.sh` is not present in this repository; formatting is not runnable via the step template command and must be handled via project-specific scripts.
