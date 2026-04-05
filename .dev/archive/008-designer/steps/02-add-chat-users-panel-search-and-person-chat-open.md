# Step 02: Add users panel, search, and person-chat open/create

## Goal
Extend the chats column to include a user list under chats, add debounced search, and open/create direct chats when a user is clicked.

## Motivation
The chat column must become a unified communication entry point: users can find either a chat or a person quickly and open DMs from the same column.

## Type
feature, ui

## Affected Area
`apps/designer/src/routes/ChatsColumn.tsx`, new user card component(s) under `apps/designer/src/components/`, `apps/designer/src/state/store.ts`, `apps/designer/src/state/designerNavigation.ts`, `apps/designer/src/state/chatComposerActions.ts` (if person-chat creation helper is shared), optional tests in `apps/designer/src/state/*` and component tests.

## Dependencies
Depends on step 01.

## Current Behavior
`ChatsColumn` renders only chats and a simple header row. There is no search input, no users block, and no ability to open/create a person chat from a user entry.

## Expected Behavior
The column renders:
- header row with title and gear;
- second row with search input and clear button;
- filtered chats list;
- small gap, heading `Пользователи`, then filtered user list (excluding current session user).
Clicking a user opens existing person chat with that user or creates it once and reuses it later.

## Specification
- In `ChatsColumn`:
  - add search state with 250ms debounce;
  - search is case-insensitive and token-order-independent (e.g., query `ди ал` matches `Далин Ог`Дип`);
  - search scope is only `chat.title` and `user.fullname`;
  - behavior is filter-only: show only matched chats/users.
- Add clear (`X`) action in search input, visible only when input is non-empty.
- Render users section below chats:
  - heading text exactly `Пользователи`;
  - list users of selected server excluding `selectedServer.user.id`;
  - user card shows name, online marker, and formatted `lastSeenAt`.
- Implement deterministic DM open/create:
  - if a person chat for `(serverId, peerUserId)` exists, navigate to it;
  - otherwise create one in local store/state and link it to server once;
  - subsequent clicks reuse that same chat id.
- Keep all styling with Tailwind + DaisyUI.

## Acceptance Criteria
1. Chat column shows both chats and users sections for a selected server.
2. Search input debounces by 250ms and filters chats/users by the confirmed matching rules.
3. Clear button appears only for non-empty query and resets full lists.
4. Clicking a user opens existing DM or creates it once, then always reopens the same DM.
5. Current session user is never shown in the users subsection.

## Verification Scenario
1. Open any server with multiple users.
2. Verify users list appears under chats with heading `Пользователи`.
3. Type a multi-token query in mixed case; verify expected chat/user rows remain.
4. Clear search and verify full lists return.
5. Click a user without DM, verify DM opens; navigate away and click again, verify same DM opens (no duplicates).

## Testing
- Vitest:
  - state-level test for deterministic person-chat creation/reuse;
  - search matching test for order-independent token behavior.
- Manual UI verification in designer app for search debounce and click flow.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- Keep DM creation sandbox-local; no network calls.
- Preserve existing server-switch skeleton behavior while adding new content blocks.
