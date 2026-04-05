# Step 03: Add online indicators and unify column header background

## Goal
Show user online state in chat-related UI points and make all three main column headers use `bg-base-300`.

## Motivation
Presence cues and consistent header visuals are required for readability and visual coherence of the three-column shell.

## Type
ui, feature

## Affected Area
`apps/designer/src/components/ChatCard.tsx`, user card component from step 02, `apps/designer/src/routes/ChatColumn.tsx`, `apps/designer/src/routes/ServicesColumn.tsx`, `apps/designer/src/routes/ChatsColumn.tsx`, `apps/designer/src/state/store.ts`.

## Dependencies
Depends on steps 01 and 02.

## Current Behavior
No online markers are rendered in chat cards, users list, or chat header. Header backgrounds are not consistent across the three columns.

## Expected Behavior
- Personal chat cards show a green online marker next to chat title.
- User cards in chats column show online marker and `lastSeenAt`.
- Chat header shows online marker only when selected chat is `person`.
- All three main column headers (`Services`, `Chats`, `Chat`) use `bg-base-300`.

## Specification
- Use `users[].isOnline` as source of truth (already stable/deterministic from step 01 mock model).
- In `ChatCard`:
  - for `chat.type === "person"`, resolve peer user and render green marker next to the title text;
  - group chats do not require marker.
- In `ChatColumn` header:
  - when selected chat is person, render same marker in title row.
- In users list cards (from step 02):
  - render marker and formatted last seen time.
- Apply `bg-base-300` to header containers in:
  - `ServicesColumn`;
  - `ChatsColumn`;
  - `ChatColumn`.
- Keep existing border and spacing semantics unless they conflict with the new background rule.

## Acceptance Criteria
1. Personal chat cards display green online marker near the name; group cards do not.
2. User list cards display online marker and last-seen value.
3. Selected person chat header displays online marker.
4. The three primary column headers all visually use `bg-base-300`.
5. No role-based regression in rendering chat cards/header content.

## Verification Scenario
1. Open a server with both group and person chats.
2. Verify marker appears only on person chat cards.
3. Select a person chat and verify marker in chat header.
4. Compare all three column headers and verify identical `bg-base-300` background.

## Testing
- Manual UI verification in designer app.
- Optional component-level snapshot/assertion tests for marker conditional rendering.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- Keep marker styling compact and aligned with existing typography.
