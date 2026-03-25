# Step 04: Enrich Chat Mocks And Render Message Stream

## Goal
Upgrade mock chat/message model and render a real message stream UI with loading simulation on server/chat changes.

## Motivation
Current chat page is still a placeholder and cannot validate conversational UX, scrolling behavior, direction styling, or header semantics.

## Type
feature, ui, data-model

## Affected Area
`apps/designer/src/state/mocks.json`, `apps/designer/src/state/store.ts`, chat-related route/view components (chat body in new chat column shell), supporting message item component(s) under `apps/designer/src/components`.

## Dependencies
Depends on step 03.

## Current Behavior
Mock messages are sparse and only partially linked to chats, `ChatPage` renders placeholder text instead of real messages, and there is no loading simulation when switching server/chat.

## Expected Behavior
- Mocks cover all existing chats with meaningful message history.
- Some chats contain enough messages to force visible scrolling.
- Chat model supports future `person|group` design:
  - `type: "person" | "group"`,
  - person chats use peer name in header,
  - group chats use `title` (group chats may remain absent for now, but model is ready).
- At least one server mock uses role `root` for gear-condition testing.
- Message direction is computed by `message.author === session.user.id`.
- Message list is displayed with:
  - text,
  - sent date/time,
  - subtle style difference between outgoing and incoming.
- Loading simulation appears when changing selected server and when changing selected chat.

## Specification
1. Extend mock contracts in `mocks.json` and corresponding TypeScript types:
   - chats: add `type` and fields needed for peer/group header behavior,
   - messages: ensure author ids are compatible with server session user ids,
   - server users: include at least one `root` role variant.
2. Populate message sets for every chat and include higher-volume chats for scroll testing.
3. Replace placeholder chat body with mapped message list renderer.
4. Add deterministic loading state simulation (e.g., timeout-based mock loader):
   - trigger on server switch,
   - trigger on chat switch,
   - show skeleton/loader in message body region.
5. Keep unknown/empty selection behavior from step 01 (main body may remain empty when nothing selected).

## Acceptance Criteria
1. Every chat has at least one associated message in mock graph.
2. At least one chat has enough items to produce internal message-list scroll.
3. Chat header displays peer name for person chat.
4. Message bubbles/rows show clear but subtle incoming/outgoing color difference.
5. Loader appears during server switch and chat switch before messages render.
6. No placeholder text remains in chat body for normal selected-chat flow.

## Verification Scenario
1. Open `http://localhost:5173/` via MCP `cursor-ide-browser`.
2. Open several different chats and verify each displays messages.
3. Confirm at least one chat provides long scroll in message body.
4. Switch between servers and observe loading state before messages appear.
5. Switch between chats in one server and observe loading state each time.
6. Validate direction styling by comparing messages authored by current session user id vs others.

## Testing
Manual-only verification in designer UI via MCP `cursor-ide-browser` on `http://localhost:5173/`.  
No Playwright/Vitest additions in this scope by explicit product decision.

## Notes
- Keep model changes incremental and focused on designer needs; avoid introducing backend contracts into sandbox runtime.
- Document any temporary mock assumptions in `Notes` comments near type definitions.
