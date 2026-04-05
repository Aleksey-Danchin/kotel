# Step 01: Restructure mock catalog and identity fields

## Goal
Introduce a normalized mock data model for server users and sessions, and migrate chat messages from `author` to `userId`.

## Motivation
Most requested UI behaviors (user list per server, person-chat creation, online markers, settings tabs) depend on explicit user/server/session links that do not exist in the current mock schema.

## Type
data-model, refactor, ui

## Affected Area
`apps/designer/src/state/mocks.json`, `apps/designer/src/state/store.ts`, `apps/designer/src/state/servers.ts`, `apps/designer/src/state/chatComposerActions.ts`, `apps/designer/src/components/ChatMessageList.tsx`, related tests in `apps/designer/src/state/*.test.ts`.

## Dependencies
None.

## Current Behavior
`mocks.json` has `servers`, `chats`, `messages`, `serverChats`, `chatMessages`, but no `users`, `serverUsers`, or account sessions catalog. Message records use `author` string, and code paths (`ChatMessage`, `sendDesignerChatMessage`, thread rendering) compare against that field.

## Expected Behavior
The state layer exposes a normalized user catalog and links (`users`, `serverUsers`), keeps `servers[].user` as the active session user, stores server display names, stores per-user online metadata (`isOnline`, `lastSeenAt`), stores account sessions, and uses `message.userId` everywhere instead of `author`.

## Specification
- Extend `mocks.json` with:
  - global `users` array;
  - `serverUsers: [serverId, userId][]`;
  - `sessions` array with `{ id, serverId, createdAt }`;
  - explicit server display name field as `server.name`;
  - user online metadata: `isOnline: boolean`, `lastSeenAt: string (ISO)`.
- Keep `servers[].user` as the source of currently authorized user for each server; ensure that `servers[].user.id` exists in `users` and is linked in `serverUsers`.
- Rename message field from `author` to `userId` in mock data and in all TS contracts/selectors/actions.
- Update `ChatMessage` type and all message merge/send/render logic to use `userId`.
- Keep sorting and existing route resolution behavior unchanged in this step.
- Add/adjust helper selectors in `store.ts` for:
  - users of selected server (excluding current user);
  - chat peer lookup by user id for `person` chats;
  - sessions by selected server.
- Update tests touching `ChatMessage` semantics to assert `userId` behavior.

## Acceptance Criteria
1. `mocks.json` contains `users`, `serverUsers`, `sessions`, and server name fields, and all message records use `userId`.
2. `store.ts` and `chatComposerActions.ts` compile without any reference to `message.author`.
3. The active server session still resolves from `servers[].user`, and this user is present in the normalized user catalog.
4. Existing chat list and thread rendering still work with migrated data.
5. Updated tests cover the `userId` migration and pass.

## Verification Scenario
1. Start the designer app and open any server and chat.
2. Verify that existing messages still render and outgoing/incoming direction is correct.
3. Trigger local send + auto-reply and verify newly appended messages use the same rendering direction logic as before.
4. Inspect mock state usage in devtools/logs and confirm no `author` field reads remain.

## Testing
- Unit tests (Vitest) for state/message actions:
  - `chatComposerActions.test.ts`;
  - any tests that assert message identity fields.
- Manual smoke in designer route (`/`) for opening chat and sending messages.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- Do not add backend integration; this remains sandbox-only mock state.
- Keep data serializable and local-storage-safe.
