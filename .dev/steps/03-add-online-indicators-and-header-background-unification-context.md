---

## step-imp — 2026-03-26T10:38:33Z

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/components/ChatCard.tsx` — added online/offline marker rendering for person chats near title.
- `apps/designer/src/routes/ChatsColumn.tsx` — resolved person chat peer users and passed them to chat cards; unified header background to `bg-base-300`.
- `apps/designer/src/routes/ChatColumn.tsx` — added person chat header online/offline marker and unified header background to `bg-base-300`.
- `apps/designer/src/routes/ServicesColumn.tsx` — unified header background to `bg-base-300`.
- `apps/designer/src/state/store.ts` — extracted `resolvePersonChatPeer()` helper and reused it in selected person chat peer atom.
- `apps/designer/src/state/store.test.ts` — added tests for person/group peer resolution behavior.

### Tests
- Task-specific: 3 passed, 0 failed (`docker exec kris-frontend-test sh -lc "cd /apps/designer && npx vitest run src/state/store.test.ts"`).
- Regression: 24 passed, 0 failed (`docker exec kris-frontend-test sh -lc "cd /apps/designer && npm test"`).

### Acceptance Criteria
- [x] AC-1: Personal chat cards display marker; groups do not — verified by code inspection and `resolvePersonChatPeer` test coverage.
- [x] AC-2: User cards display marker and last seen — verified by code inspection in `UserCard`.
- [x] AC-3: Selected person chat header displays marker — verified by code inspection in `ChatColumn`.
- [x] AC-4: Services/Chats/Chat headers use `bg-base-300` — verified by code inspection in all three route columns.
- [x] AC-5: No card/header role-based regression — verified by unchanged `chatHeaderTitle` flow and passing full designer regression suite.

### Discoveries
- `infra/compose/test.yml` requires `PROJECT_ROOT`; direct `docker compose -f ...` may fail in this workspace, while `scripts/test-start.sh` / `scripts/test-stop.sh` works reliably.
