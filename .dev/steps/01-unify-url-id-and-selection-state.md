# Step 01: Unify URL ID And Selection State

## Goal
Introduce a single dynamic URL parameter `/:id` in `apps/designer` that can represent either a server identifier or a chat identifier, and rebuild persisted selection state around `serverId` plus `lastChatByServerId`.

## Motivation
Current behavior mixes route params and local storage in a way that auto-selects a default server and does not match the requested UX for explicit empty state, deterministic URL-driven selection, and per-server last chat memory.

## Type
bugfix, ui, architectural

## Affected Area
`apps/designer/src/routes/~$chatId/~index.tsx` (or replacement route for `/$id/`), `apps/designer/src/routes/~(index)/~index.tsx`, `apps/designer/src/state/store.ts`, `apps/designer/src/state/servers.ts`, `apps/designer/src/state/mocks.json`, router usage in `apps/designer/src/routes/ServicesColumn.tsx` and `apps/designer/src/routes/ChatsColumn.tsx`.

## Dependencies
None.

## Current Behavior
The route model is chat-only (`/$chatId/`), selected server/chat persistence relies on `selectedServerUrlAtom` and `selectedChatIdAtom`, and defaults include auto-selection (`DEFAULT_SERVER_URL` and first server fallback in `servers.ts`). Unknown route ids currently lead to explicit fallback content in chat page, not a fully silent empty main state.

## Expected Behavior
`/:id` is the only dynamic selection route and accepts either:
- `serverId` (derived from server host, with `:` replaced by `.` for route safety),
- or `chatId` (CUID-like id).

State resolution rules:
- If URL `id` maps to server: server is selected, chat is restored from `lastChatByServerId[serverId]` if valid; otherwise no chat.
- If URL `id` maps to chat: both server and chat are selected.
- If URL `id` matches nothing: no server and no chat are selected; server list remains visible; chats list is empty; main area is empty (no error text).
- If URL has no `id`: restore last active server from storage; if absent, keep everything unselected.

Persistence rules:
- Remove legacy persisted selected chat key usage.
- Persist active server as `serverId` (not `serverUrl`).
- Persist per-server last chat mapping as `kotel.designer.lastChatByServerId`.

## Specification
1. Replace route contract `/$chatId/` with unified dynamic route `/$id/` while keeping static routes (`/setup`, `/session-test`, `/users`, `/callback`) unchanged and higher-priority.
2. Add utility functions to map between `serverUrl`, `serverHost`, and `serverId`:
   - `serverIdFromUrl(serverUrl) -> host with ":" replaced by "."`,
   - reverse/lookup resolver for existing server sessions.
3. Update state graph in `store.ts`:
   - remove dependence on `selectedChatIdAtom` as persisted source of truth,
   - add atom/storage for `activeServerId`,
   - add atom/storage for `{ [serverId]: chatId }`,
   - provide derived atoms/selectors for resolved selected server and selected chat based on current route `id` and persisted values.
4. Remove auto-default behavior:
   - no `DEFAULT_SERVER_URL`,
   - no first-server fallback on initial load,
   - initial empty selection when URL and storage do not provide valid values.
5. Ensure unknown `id` path does not render error notices in main chat area; it must render an empty body.
6. Keep route-state logic deterministic and serializable; avoid hidden implicit selections.

## Acceptance Criteria
1. Navigating to `/kotel.localhost` selects that server and no chat unless restored via `lastChatByServerId`.
2. Navigating to `/chat_xxx` selects corresponding chat and its server.
3. Navigating to an unknown id leaves both server and chat unselected, with empty main area and empty chats list.
4. Opening `/` with empty storage produces no selected server/chat.
5. Legacy selected-chat persistence is removed from runtime behavior.
6. Active server persistence stores `serverId`, not `serverUrl`.
7. Static routes `/setup`, `/session-test`, `/users`, `/callback` remain reachable and are not intercepted by `/:id`.

## Verification Scenario
1. Clear designer localStorage keys related to active server/chat.
2. Open `/` and verify no selected server/chat.
3. Open `/<known-server-id>` and verify server selection with empty chat if no remembered chat.
4. Open `/<known-chat-id>` and verify server+chat selection.
5. Open `/<unknown-id>` and verify no error text in main area and empty chat list.
6. Reload page and verify selection restoration follows the new storage rules.

## Testing
Manual verification only in `apps/designer` is required for this step.  
Automated E2E coverage is intentionally deferred to future `apps/frontend` migration per user decision.

## Notes
- TanStack Router supports this model: static paths remain resolvable before dynamic param routes.
- Include short migration handling for old localStorage keys to avoid stale state confusion during transition.
