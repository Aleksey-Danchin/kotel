---

## step-imp — 2026-03-26T13:29:04+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/state/mocks.json` — added normalized `users`, `serverUsers`, `sessions`, server `name`, and migrated message records to `userId`
- `apps/designer/src/state/store.ts` — migrated `ChatMessage` to `userId` and added selectors for server users, person-chat peer lookup, and sessions
- `apps/designer/src/state/chatComposerActions.ts` — migrated outgoing/incoming message identity handling from `author` to `userId`
- `apps/designer/src/components/ChatMessageList.tsx` — switched outgoing direction logic to `message.userId`
- `apps/designer/src/routes/ChatColumn.tsx` — switched unread incoming counter logic to `message.userId`
- `apps/designer/src/state/chatComposerActions.test.ts` — updated tests to assert `userId` behavior

### Tests
- Task-specific: 3 passed, 0 failed (`npx vitest run src/state/chatComposerActions.test.ts` in `apps/designer`)
- Regression: 18 passed, 0 failed (`npm test` in `apps/designer`)

### Acceptance Criteria
- [x] AC-1: `mocks.json` contains `users`, `serverUsers`, `sessions`, `server.name` and message `userId` — verified by: code inspection
- [x] AC-2: `store.ts` and `chatComposerActions.ts` have no `message.author` references — verified by: code inspection + search
- [x] AC-3: active server session remains `servers[].user` and linked in normalized users — verified by: code inspection of mocks + selectors
- [x] AC-4: chat rendering logic remains intact with migrated identity field — verified by: code inspection of thread/message direction logic + regression tests
- [x] AC-5: tests updated for `userId` migration and pass — verified by: passing task-specific and regression Vitest runs

### Discoveries
- `infra/compose/test.yml` requires `PROJECT_ROOT` to be set in the environment for compose commands.
- The `kris-frontend-test` test container mounts only `apps/frontend`, so `apps/designer` tests must run on host.
