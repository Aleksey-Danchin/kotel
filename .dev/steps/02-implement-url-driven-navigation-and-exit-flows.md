# Step 02: Implement URL-Driven Navigation And Exit Flows

## Goal
Make all server/chat interactions update and consume `/:id` consistently, including Escape behavior and chat-memory cleanup when leaving chat level.

## Motivation
Even with a correct state model, UX remains inconsistent unless every interaction path (clicks, Esc, browser navigation) follows the same URL-first transitions and cleanup rules.

## Type
bugfix, ui

## Affected Area
`apps/designer/src/routes/~__root.tsx`, `apps/designer/src/routes/ServicesColumn.tsx`, `apps/designer/src/routes/ChatsColumn.tsx`, unified dynamic route component for `/$id/`, selection actions in `apps/designer/src/state/store.ts`.

## Dependencies
Depends on step 01.

## Current Behavior
`ServicesColumn` and `ChatsColumn` write atoms directly and only chat selection pushes route navigation; Esc logic in root currently sends chat-level escape to `/` and does not move to `/:serverId` nor fully align with per-server chat memory lifecycle.

## Expected Behavior
All user transitions are URL-driven:
- Selecting server card navigates to `/:serverId`.
- Selecting chat card navigates to `/:chatId`.
- Esc from chat level navigates to `/:serverId`.
- Esc from server level navigates to `/`.

Cleanup rule:
- Whenever user exits from chat level to server level (not only via Esc), remove that server's remembered last chat from in-memory state and localStorage map.

## Specification
1. Refactor click handlers in server/chat columns so URL navigation is the primary action; atom updates should be derived from route resolution.
2. Update global Escape handling in root layout:
   - detect current level (`chat` vs `server`) from resolved route/state,
   - on chat level, navigate to selected `serverId`,
   - on server level, navigate to `/`.
3. Implement centralized transition helper(s) in store or route utilities:
   - `enterServer(serverId)`,
   - `enterChat(chatId, serverId)`,
   - `exitChatToServer(serverId)` (with last-chat cleanup),
   - `exitServerToRoot()` (clear active server persistence).
4. Ensure browser back/forward keeps state coherent with URL parsing and does not leave stale selected chat.
5. Preserve current guard conditions in Esc listener (ignore open dialog and form-focused inputs).

## Acceptance Criteria
1. Clicking a server card changes URL to `/:serverId`.
2. Clicking a chat card changes URL to `/:chatId`.
3. Pressing Esc on chat page moves to `/:serverId`.
4. Pressing Esc on server-level view moves to `/`.
5. Leaving chat level to server level clears `lastChatByServerId[currentServerId]`.
6. Browser back/forward transitions do not produce mismatched server/chat selection.

## Verification Scenario
1. Open a server, then open a chat.
2. Verify URL reflects selected chat id.
3. Press Esc and verify URL becomes server id and chat memory for that server is removed.
4. Re-enter same server and verify no auto-chat selection occurs.
5. Open chat again, then navigate to server via any non-Esc path (e.g., server card click), verify cleanup still happens.
6. Press Esc from server level and verify URL becomes `/`.

## Testing
Manual interaction checks in designer UI only.  
Do not add E2E tests in this scope (explicitly deferred).

## Notes
- Keep transition rules in one place to avoid future drift between route handlers and keydown handler.
- This step reduces implicit coupling between UI events and persisted atoms.
