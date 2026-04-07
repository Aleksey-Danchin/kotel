# Step 04: Unify Chats Column Into Single Sorted Feed

## Goal
Replace the current two-section chats/users column with one unified feed that includes chats and users-without-chat, sorted by latest message activity and alphabetic fallback.

## Motivation
Current split between chat list and user list hides recency context and forces extra scanning. A single activity-oriented list improves discoverability and interaction speed.

## Type
ui, feature, refactor

## Affected Area
`apps/designer/src/routes/ChatsColumn.tsx`, `apps/designer/src/components/ChatCard.tsx`, `apps/designer/src/components/UserCard.tsx` (or replacements), `apps/designer/src/state/store.ts`, optional new shared card primitive in `apps/designer/src/components/**`

## Dependencies
Depends on steps 01, 02

## Current Behavior
`ChatsColumn` renders two independent blocks:
1. `filteredChats` list using `ChatCard`;
2. a separate "Пользователи" section using `UserCard`.
Sorting is not unified by latest message across both entity types.

## Expected Behavior
1. The column renders one combined list.
2. Combined list includes:
   - existing chats (group/person),
   - users without an existing person chat (click creates/opens person chat).
3. Sorting:
   - items with at least one message first, ordered by latest message timestamp descending;
   - items without messages after that, ordered alphabetically by display title/fullname.
4. Card architecture:
   - introduce a reusable base card component;
   - keep two specialized adapters/compositions (chat item and user-without-chat item) on top of that base.

## Specification
1. Build unified item model in chats column (or state helper), with explicit item kind:
   - `chat-item` for existing chat previews;
   - `user-item` for users that do not yet have a person chat in current server scope.
2. Derive latest message timestamp per item:
   - for chats: from `getChatMessages(chat.id)` max `createdAt`;
   - for user-item without chat: no message timestamp.
3. Exclude duplicates:
   - if a person chat already exists for a user, represent that person only through chat-item, not through extra user-item.
4. Keep search behavior aligned with unified feed:
   - search should filter within this combined list (titles/fullnames/subtitles as applicable).
5. Interaction behavior:
   - clicking chat-item opens that chat as before;
   - clicking user-item invokes `findOrCreatePersonChat(...)` and navigates to the created/resolved DM.
6. Implement shared card primitive:
   - define required base props (title, secondary text, leading marker/icon, unread badge, click handler, active state);
   - create focused wrappers for chat and user entries that map domain data to the base component.
7. Remove old visual "Пользователи" divider section and down-arrow separator from final layout.

## Acceptance Criteria
1. Chats column shows a single list without separate users section.
2. Existing chats and users-without-chat are both present in the unified list.
3. Items with messages are sorted by latest message descending.
4. Items without messages are sorted alphabetically and placed after message-bearing items.
5. No duplicate entry exists for a user who already has a person chat.
6. Clicking a user-without-chat creates or opens DM and navigates correctly.
7. Card rendering uses a shared base component with specialized adapters.

## Verification Scenario
1. Open a server in designer with mixed data (group chats, person chats, and users without DM).
2. Observe that only one combined list is rendered in chats column.
3. Validate top ordering by recency of last message.
4. Validate tail ordering alphabetically for entries without messages.
5. Click a user-without-chat item and verify a DM opens and appears as chat-item afterwards.
6. Use search input and verify filtering works consistently across both item kinds.

## Testing
Manual verification only in `apps/designer`:
- list composition and ordering checks;
- navigation and DM creation checks;
- search behavior checks.

## Notes
Prefer explicit mapper functions for feed item construction and sort keys to keep future maintenance predictable as state model evolves.
