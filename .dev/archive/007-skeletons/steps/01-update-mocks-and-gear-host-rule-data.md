# Step 01: Update Mocks And Gear Host Rule Data

## Goal
Align mock server/chat data with the requested host-based gear visibility rule and add explicit empty-data scenarios required for UI behavior checks.

## Motivation
Current mock data prevents gear visibility on local dev host and does not provide canonical test cases for “server without chats” and “chat without messages”.

## Type
feature, data-model, ui

## Affected Area
`apps/designer/src/state/mocks.json`, `apps/designer/src/state/servers.ts`, `apps/designer/src/state/headerGear.ts`, server/chat selection derivation in `apps/designer/src/state/store.ts` if needed for new mock entities.

## Dependencies
None.

## Current Behavior
`shouldShowColumnHeaderGear()` in `headerGear.ts` checks strict host equality, but default servers in `mocks.json` use non-local hosts, so the gear is not shown on `http://localhost:5173`. Also, all active server/chat examples are populated enough that empty-chat and no-chats edge cases are not fully represented by dedicated mock fixtures.

## Expected Behavior
- At least one default server matches local dev host `localhost:5173` while preserving strict host comparison.
- At least one server has zero chats and is visible in server list.
- At least one chat exists with zero messages and is reachable from a regular server (requested: in `srv_main`).

## Specification
1. Keep strict host rule in `headerGear.ts` (`serverUrl.host === window.location.host`); do not loosen comparison semantics.
2. Update one default server in `mocks.json` to `http://localhost:5173` and assign role `admin` or `root` so gear can be visible under existing rule.
3. Add a new server mock entry with valid `id`, `serverUrl`, and `user` but no links in `serverChats`.
4. Add one new chat in `srv_main` with proper chat metadata and no linked records in `chatMessages`.
5. Ensure `servers.ts` default-server bootstrap still normalizes server sessions from updated mocks and keeps route IDs stable.
6. Keep all added entities deterministic and compatible with current route resolution and card rendering.

## Acceptance Criteria
1. Opening local designer host can satisfy gear visibility rule without changing comparison logic.
2. A dedicated server exists with no linked chats.
3. A dedicated chat exists in `srv_main` with no linked messages.
4. Existing server/chat rendering and route resolution still work for old mock entities.

## Verification Scenario
1. Open `http://localhost:5173/` via MCP `cursor-ide-browser`.
2. Select the server that now uses local host and verify header gear can be visible for allowed role.
3. Select the server-without-chats and verify chats column can enter the “no chats” state.
4. Select `srv_main`, open the new empty chat, and verify messages are absent while chat selection itself works.

## Testing
Manual verification via MCP `cursor-ide-browser` on `http://localhost:5173/`.  
No automated test additions in this scope.

## Notes
- Keep user-facing strings in Russian where applicable.
- Avoid changing route contract; this step is data + rule alignment only.
