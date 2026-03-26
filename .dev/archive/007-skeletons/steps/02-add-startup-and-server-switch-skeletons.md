# Step 02: Add Startup And Server-Switch Skeletons

## Goal
Implement unified loading skeleton behavior for initial page load and server switching, including synchronized loading in all three columns on startup.

## Motivation
Current loading UX is inconsistent: message loading skeleton exists in chat stream transitions, but startup and server-level transitions are missing required placeholders.

## Type
feature, ui

## Affected Area
`apps/designer/src/routes/~__root.tsx`, `apps/designer/src/routes/ServicesColumn.tsx`, `apps/designer/src/routes/ChatsColumn.tsx`, `apps/designer/src/routes/ChatColumn.tsx`, `apps/designer/src/routes/~$id/~index.tsx`, and skeleton components under `apps/designer/src/components`.

## Dependencies
Depends on step 01.

## Current Behavior
`~$id/~index.tsx` has only chat-stream loading simulation (`CHAT_STREAM_LOAD_MS`), while startup and server-switch loading for servers/chats columns are absent.

## Expected Behavior
- Startup: skeletons are shown in all 3 columns.
- Server switch: skeletons are shown in chats + messages columns.
- Loading delay is fixed and unified: `1200ms` for all required loading cases.

## Specification
1. Introduce a shared loading duration constant set to `1200ms` and reuse it for startup and server/chat transition loaders.
2. Add startup loading state in root/shell orchestration:
   - show placeholder skeletons for Services, Chats, and Chat columns before regular content.
3. Add server-switch loading state:
   - when selected server changes, show loading placeholders in chats and message area for `1200ms`.
4. Keep chat-switch loading behavior aligned with the same delay and avoid conflicting timers/race conditions.
5. Ensure loading state transitions are deterministic when user switches servers/chats rapidly.

## Acceptance Criteria
1. On initial page load, all three columns display loading skeletons.
2. After startup delay, normal UI appears.
3. On server change, chats and messages areas display loading skeletons.
4. Loading delay is consistently `1200ms` across startup/server-switch/chat-switch flows.
5. Rapid switching does not leave stale skeletons stuck on screen.

## Verification Scenario
1. Open `http://localhost:5173/` via MCP `cursor-ide-browser`.
2. Reload the page and confirm all three columns initially show skeletons.
3. Wait ~1.2s and verify regular UI replaces skeletons.
4. Switch between two servers and verify chats/messages loading skeletons appear for ~1.2s.
5. Switch chats inside one server and verify loading behavior remains consistent.

## Testing
Manual verification via MCP `cursor-ide-browser` on `http://localhost:5173/`.  
No automated test additions in this scope.

## Notes
- Keep skeleton rendering accessible (`aria-busy`, labels where applicable).
- Avoid full-screen blocking overlays; use per-column loading placeholders per requested UX.
