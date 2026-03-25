---

## step-imp — 2026-03-25T23:48:04+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/state/mocks.json` — updated mock server/chat data for localhost host-based gear visibility and added empty fixtures

### Tests
- Task-specific: `vitest` (apps/designer) — 5 test files passed, 0 failed
- Regression: cancelled

### Acceptance Criteria
- [x] AC-1: Opening local designer host can satisfy gear visibility rule — verified by: code inspection (strict host equality + mocks serverUrl/role)
- [x] AC-2: Dedicated server exists with no linked chats — verified by: code inspection (srv_no_chats has zero serverChats links; ChatsColumn renders empty state)
- [x] AC-3: Dedicated chat exists in srv_main with no linked messages — verified by: code inspection (chat_empty_messages is linked from srv_main but has no chatMessages; ChatMessageList renders empty state)
- [x] AC-4: Existing rendering and route resolution still work for old mock entities — verified by: code inspection (no removals; route resolution uses chatId/serverId links and deterministic serverUrl->routeId mapping)

### Discoveries
- none

