# Step 02: Refactor selection resolution for server-chat-config

## Goal
Rework route-to-state resolution so server, chat, and configurator selection are resolved from hierarchical URLs with deterministic fallbacks.

## Motivation
Current selection logic in atoms and helpers is centered on one segment (`selectionIdFromPathname`) and cannot express server/chat hierarchy plus configurator state safely.

## Type
architectural, refactor

## Affected Area
`apps/designer/src/state/routePath.ts`, `apps/designer/src/state/store.ts`, `apps/designer/src/state/designerNavigation.ts`, `apps/designer/src/routes/~__root.tsx`, `apps/designer/src/state/selectionAtoms.ts`, related tests in `apps/designer/src/state/*.test.ts`

## Dependencies
Depends on step 01.

## Current Behavior
- Route context is `{ type: "index" }` or `{ type: "id"; id: string }`.
- `resolveRouteParam()` chooses server/chat from one id and a preferred server.
- `selectedServerAtom`, `effectiveChatIdAtom`, and navigation cleanup are keyed to the legacy single-segment model.

## Expected Behavior
- Route context explicitly distinguishes:
  - home
  - server route
  - server+chat route
  - configurator root
  - configurator with server
- Resolution rules:
  - unknown server in selection routes -> behave as home
  - unknown server in configurator routes -> behave as `/config`
  - unknown chat under valid server -> ignore chat and behave as `/:serverId`
- `activeServerIdAtom` remains source of "last active server" for configurator opening fallback.

## Specification
- Replace first-segment parsing helper with structured path extraction that can return route mode and typed params.
- Introduce or adapt resolver APIs so server validation is done first for server/chat routes.
- Ensure chat resolution is constrained to the server from URL; do not infer another server for the same chat id.
- Update root layout synchronization logic to:
  - set route context for new modes
  - set/clear `activeServerIdAtom` according to resolved server context
  - preserve fallback behavior defined in Q&A
- Refactor cleanup logic (`serverRouteIdToClearAfterPathChange`) to operate on structured route transitions instead of legacy raw id assumptions.
- Keep persistence strategy intact (`activeServerIdAtom` storage and migration behavior), but align reads/writes with new context modes.

## Acceptance Criteria
1. Route context model can represent all five URL modes without overloading one `id` field.
2. Unknown `serverId` and unknown `chatId` fallback behavior matches agreed rules exactly.
3. Chat resolution never auto-switches to another server when URL explicitly contains `serverId`.
4. Existing state persistence keys continue to work; no data loss from local storage migration paths.
5. Root route synchronization code no longer depends on legacy `selectionIdFromPathname` semantics.

## Verification Scenario
1. Open valid `/:serverId/:chatId` and verify both selected server and selected chat are set.
2. Change URL to `/:serverId/nonexistent-chat` and verify selected chat is cleared while server remains selected.
3. Change URL to `/nonexistent-server` and verify app behaves as home.
4. Open `/config/nonexistent-server` and verify app behaves as `/config`.
5. Refresh page and verify `activeServerIdAtom` persistence still restores server context where applicable.

## Testing
- Update `routePath` and navigation tests to cover structured route parsing and transition cleanup.
- Add atom-level tests for `selectedServerAtom` / effective chat resolution with server-bound chat checks.
- Add fallback behavior tests for unknown server and unknown chat in both selection and configurator routes.
- Run Vitest for `apps/designer/src/state`.

## Notes
- Keep implementation framework-agnostic within state helpers where possible; avoid coupling parsers to React components.
- Remove obsolete tests that encode legacy `/$id` behavior and replace with route-contract tests for the new URL model.
