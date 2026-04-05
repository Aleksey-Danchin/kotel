---

## step-imp — 2026-03-26T14:02:21+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/state/designerNavigation.ts` — adjusted cleanup logic to keep last chat when switching from chat to a different server.
- `apps/designer/src/state/designerNavigation.test.ts` — added regression test for server switch without chat memory cleanup.
- `apps/designer/src/state/chatComposerConstraints.ts` — added composer limit/counter helper constants and functions.
- `apps/designer/src/state/chatComposerConstraints.test.ts` — added tests for hard limit and counter threshold behavior.
- `apps/designer/src/routes/ChatColumn.tsx` — implemented 1024 max length, reserved counter area, autosize 2..10 rows, and stronger sticky scroll retention.

### Tests
- Task-specific: 10 passed, 0 failed (`designerNavigation`, `chatComposerConstraints`, `chatThreadScrollLogic`)
- Regression: 46 passed, 0 failed (`npm test` in `apps/designer`)

### Acceptance Criteria
- [x] AC-1: per-server last chat restores unless explicitly exited — verified by: `designerNavigation.test.ts` server-switch regression test.
- [x] AC-2: composer hard limit 1024 chars — verified by: `chatComposerConstraints.test.ts` clamp test + `maxLength` in composer.
- [x] AC-3: counter shows in last 50 chars with reserved space — verified by: `chatComposerConstraints.test.ts` threshold test + reserved `h-5` counter slot in composer layout.
- [x] AC-4: textarea autosize 2..10 rows then internal scroll — verified by: code inspection of dynamic height effect in `ChatColumn.tsx`.
- [x] AC-5: sticky retained across all message add scenarios — verified by: code inspection of pre+post bottom sync in `notifyThreadMessagesSnapshot` and existing sticky logic tests.

### Discoveries
- `scripts/prettier.sh` is absent in the repository; formatting phase should be skipped/cancelled in this step framework.

---

## step-imp — 2026-03-26T15:08:48+03:00

**Result**: SUCCESS

### Changed Files
- none (re-validation pass; implementation already present from previous run)

### Tests
- Task-specific: 10 passed, 0 failed (`designerNavigation`, `chatComposerConstraints`, `chatThreadScrollLogic`)
- Regression: 51 passed, 0 failed (`npm test` in `apps/designer`)

### Acceptance Criteria
- [x] AC-1: per-server last chat restores unless explicitly exited — verified by: `src/state/designerNavigation.test.ts` (server-switch regression case) + browser navigation smoke (with 1s waits).
- [x] AC-2: composer hard limit 1024 chars — verified by: `src/state/chatComposerConstraints.test.ts` + `maxLength={1024}` in `ChatColumn`.
- [x] AC-3: counter shows only in final 50 chars with reserved space — verified by: `src/state/chatComposerConstraints.test.ts` + reserved `h-5` counter slot in `ChatColumn`.
- [x] AC-4: textarea autosizes 2..10 rows then internal scroll — verified by: code inspection of autosize effect in `ChatColumn`.
- [x] AC-5: sticky retained across message-add scenarios in sticky mode — verified by: `src/state/chatThreadScrollLogic.test.ts` + code inspection of pre/post bottom sync flow.

### Discoveries
- MCP browser validation at `localhost:5174` required for this session because active designer Vite server auto-shifted from port `5173` (port in use).
