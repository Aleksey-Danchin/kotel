---

## step-imp — 2026-03-25T19:31:00Z

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/state/designerNavigation.ts` — centralized navigation helpers and pathname-driven `lastChatByServerId` cleanup
- `apps/designer/src/state/designerNavigation.test.ts` — unit tests for cleanup predicate
- `apps/designer/src/routes/~__root.tsx` — Esc handling, `activeServerId` sync from URL, cleanup on path change (incl. back/forward)
- `apps/designer/src/routes/ServicesColumn.tsx` — `enterServer` for card/add flows
- `apps/designer/src/routes/ChatsColumn.tsx` — `enterChat` only (atoms follow URL)
- `apps/designer/src/routes/~$id/~index.tsx` — drop redundant `activeServerId` sync; keep `lastChat` persistence when viewing chat

### Tests
- Task-specific: 10 passed, 0 failed (`/apps/designer` Vitest in `kris-frontend-test`)
- Regression: full designer Vitest suite — 10 passed, 0 failed

### Acceptance Criteria
- [x] AC-1: server card → `/:serverId` — verified by: code inspection + `enterServer`
- [x] AC-2: chat card → `/:chatId` — verified by: code inspection + `enterChat`
- [x] AC-3: Esc on chat → `/:serverId` — verified by: code inspection + `exitChatToServer`
- [x] AC-4: Esc on server → `/` — verified by: code inspection + `exitServerToRoot`
- [x] AC-5: leave chat level clears `lastChatByServerId` for that server — verified by: `applyLastChatCleanupOnPathnameChange` + unit tests
- [x] AC-6: back/forward coherent — verified by: cleanup runs on any pathname transition away from chat id + URL-driven `activeServerId`

### Discoveries
- Designer Vitest runs in container: `docker exec kris-frontend-test sh -c 'cd /apps/designer && npm test'` with `PROJECT_ROOT` set for compose.
