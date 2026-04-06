# Step 04: Wire navigation and UX regressions to new routes

## Goal
Update all navigation entry points and keyboard flows to use the new URL model consistently, including configurator opening via last active server.

## Motivation
After introducing new routes and state resolution, user actions (server click, chat click, escape, gear/configurator open) must produce stable URLs and preserve expected UX transitions.

## Type
ui, refactor, bugfix

## Affected Area
`apps/designer/src/state/designerNavigation.ts`, `apps/designer/src/routes/ServicesColumn.tsx`, `apps/designer/src/routes/ChatsColumn.tsx`, `apps/designer/src/components/ColumnHeaderGear.tsx`, `apps/designer/src/routes/~__root.tsx`, `apps/designer/src/state/settingsOverlay.ts`, regression tests in `apps/designer/src/state/*.test.ts` and `apps/designer/src/routes/*.test.tsx`

## Dependencies
Depends on steps 01, 02, and 03.

## Current Behavior
- Navigation helpers still produce legacy paths (`/$id` and `/`).
- Chat enter/exit and server enter flows do not target `/:serverId/:chatId` contract.
- Gear action opens modal overlay instead of route mode and does not navigate to `/config...`.

## Expected Behavior
- Server select navigates to `/:serverId`.
- Chat select navigates to `/:serverId/:chatId`.
- Exiting chat returns to `/:serverId`; exiting server returns to `/`.
- Opening configurator navigates to:
  - `/config/:serverId` when `activeServerIdAtom` exists and resolves
  - `/config` when no active server is available
- All links and keyboard transitions align with new fallback rules and no longer rely on legacy `/:id`.

## Specification
- Redefine navigation helper signatures in `designerNavigation` to accept explicit server/chat params as needed.
- Update all call sites:
  - services column server selection
  - chats/user DM selection
  - escape-key flow in root layout
  - gear/configurator open actions
- Keep `activeServerIdAtom` updated on server/chat route transitions so configurator can use it as "last active server".
- Ensure switching between regular and config modes preserves predictable state:
  - server context retained when valid
  - invalid URLs gracefully normalized by existing fallback logic from step 02
- Remove dead code paths and tests tied solely to old `/$id` navigation behavior.

## Acceptance Criteria
1. No primary user interaction in the main shell navigates to legacy `/$id` paths.
2. Server and chat selections always produce hierarchical URLs with correct params.
3. Configurator open action uses `activeServerIdAtom` fallback exactly as agreed (`/config/:serverId` or `/config`).
4. Escape/back-style transitions still work and match route hierarchy expectations.
5. Regression tests cover navigation helper outputs and key interaction flows for the new URL model.

## Verification Scenario
1. From `/`, click server -> verify URL `/:serverId`.
2. Click chat inside selected server -> verify URL `/:serverId/:chatId`.
3. Press Escape in chat context -> verify URL falls back to `/:serverId`.
4. Trigger configurator open from header gear:
   - with active server -> verify `/config/:serverId`
   - without active server -> verify `/config`
5. Return from configurator mode to regular shell and verify selection state remains coherent.

## Testing
- Update `designerNavigation` unit tests for new helper signatures and resulting URLs.
- Add interaction-oriented tests for columns and root keyboard flow under hierarchical routing.
- Add configurator-open tests validating `activeServerIdAtom` fallback behavior.
- Run full `apps/designer` Vitest suite to catch regressions.

## Notes
- Preserve static routes `/setup`, `/users`, `/session-test`, `/callback`; navigation refactor must not shadow them.
- Keep route generation and navigation type safety aligned; avoid stringly-typed URL assembly where router helpers can be used.
