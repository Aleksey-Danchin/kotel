---

## step-imp — 2026-04-07T10:25:24+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/routes/ChatsColumn.tsx` — replaced split chats/users sections with one unified feed model, deduped user items when DM exists, added combined search and sort by latest message then alphabetic fallback.
- `apps/designer/src/components/ChatFeedCardBase.tsx` — introduced shared base card primitive for chat feed entries.
- `apps/designer/src/components/ChatCard.tsx` — converted chat entry rendering to specialized adapter over shared card base.
- `apps/designer/src/components/UserCard.tsx` — converted user-without-chat rendering to specialized adapter over shared card base.

### Tests
- Task-specific: 0 passed, 0 failed (designer follows manual verification policy)
- Regression: 0 passed, 0 failed (designer follows manual verification policy)

### Acceptance Criteria
- [x] AC-1: Single unified list without users section — verified by: code inspection of `ChatsColumn` unified render branch.
- [x] AC-2: Combined list has chats and users-without-chat — verified by: code inspection of `feedItems` composition.
- [x] AC-3: Message-bearing items sorted by latest message desc — verified by: code inspection of sort comparator using chat latest message timestamp.
- [x] AC-4: No-message items alphabetic after message items — verified by: code inspection of sort fallback and partition logic.
- [x] AC-5: No duplicate user when person chat exists — verified by: code inspection of `usersWithPersonChats` exclusion.
- [x] AC-6: Click user-without-chat opens/creates DM — verified by: code inspection of `UserCard` click handler calling `findOrCreatePersonChat` and `enterChat`.
- [x] AC-7: Shared base card with specialized adapters — verified by: `ChatFeedCardBase` plus `ChatCard`/`UserCard` wrappers.

### Discoveries
- `scripts/prettier.sh` is absent in this repository; formatting must use direct Prettier invocation on changed files.
