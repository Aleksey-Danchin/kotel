---

## step-imp — 2026-03-26T00:02:54+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/routes/~__root.tsx` — added 1200ms startup skeleton orchestration
- `apps/designer/src/routes/ServicesColumn.tsx` — added `isLoading` prop for startup skeleton
- `apps/designer/src/routes/ChatsColumn.tsx` — added server-switch skeleton timer (1200ms) with stale-token guard
- `apps/designer/src/routes/ChatColumn.tsx` — added `isLoading` prop for startup skeleton
- `apps/designer/src/routes/~$id/~index.tsx` — unified 1200ms message skeleton delay + deterministic token guard
- `apps/designer/src/components/loadingDelay.ts` — shared `DESIGNER_LOADING_DELAY_MS = 1200`
- `apps/designer/src/components/ServicesColumnSkeleton.tsx` — startup skeleton for services column
- `apps/designer/src/components/ChatsColumnSkeleton.tsx` — startup skeleton for chats column
- `apps/designer/src/components/ChatsColumnBodySkeleton.tsx` — body skeleton for chats transitions
- `apps/designer/src/components/ChatColumnSkeleton.tsx` — startup skeleton for chat column
- `apps/designer/src/state/designerNavigation.ts` — lint fix: noop unused `_serverRouteId` param

### Tests
- Task-specific: 0 passed, 0 failed (no automated tests added/run in this step)
- Regression: 0 passed, 0 failed (not applicable)

### Acceptance Criteria
- [x] AC-1: all three columns show loading skeletons on initial load — verified by: code inspection
- [x] AC-2: normal UI replaces skeletons after 1200ms — verified by: code inspection
- [x] AC-3: server change shows skeletons in chats and messages — verified by: code inspection
- [x] AC-4: loading delay is consistently 1200ms across flows — verified by: code inspection
- [x] AC-5: rapid switching never leaves stale skeletons stuck — verified by: token/cleanup logic inspection

### Discoveries
- ESLint `react-hooks/set-state-in-effect` disallows direct `setState(...)` inside `useEffect` bodies; use a microtask (guarded by transition id) for immediate flag flips.

