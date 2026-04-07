# Step 03: Fix Configurator Layout And Navigation UX

## Goal
Correct configurator route layout and restore expected navigation controls in settings header: no empty middle column, server dropdown in route mode, back arrow exit, and gear-button toggle exit behavior.

## Motivation
Current configurator UX wastes one column with empty space and removed key controls, making settings flow slower and inconsistent with prior behavior.

## Type
ui, feature, refactor

## Affected Area
`apps/designer/src/routes/~__root.tsx`, `apps/designer/src/components/SettingsOverlay.tsx`, `apps/designer/src/components/ColumnHeaderGear.tsx`, `apps/designer/src/state/designerNavigation.ts`, related selection state (`apps/designer/src/state/selectionAtoms.ts` if needed)

## Dependencies
Depends on steps 01, 02

## Current Behavior
1. In config mode, `~__root.tsx` renders an empty fixed-width block between services and settings content.
2. In route mode, settings header shows only a static server badge instead of server dropdown.
3. There is no left-arrow control in settings header for exiting configurator.
4. Clicking gear while already on `/config*` does not exit configurator.
5. Entry tab behavior is currently source-driven (`services -> main`, `chats -> configurator`, `chat -> users`) and should remain so.

## Expected Behavior
1. In `/config*`, settings content occupies both right columns (space right of services column) without a blank column.
2. Route-mode header includes server dropdown; selecting another server navigates to `/config/$serverId`.
3. Header has a left arrow at the start; it exits configurator to last chat `/$serverId/$chatId` when available, otherwise `/$serverId`.
4. Repeated click on any gear while already on `/config*` exits configurator to normal chat mode for the active server.
5. Entering configurator still resets initial active tab by source.

## Specification
1. Root layout:
   - remove the placeholder config column in `~__root.tsx`;
   - keep services column fixed on the left;
   - render settings route panel as the full remaining area.
2. Settings header:
   - for `mode="route"`, replace static badge-only behavior with dropdown selector equivalent to current overlay mode UX;
   - keep selected server label/host display.
3. Server switching in route mode:
   - selecting a server in dropdown triggers navigation to `/config/$serverId` for that selected server route ID.
4. Back-arrow behavior:
   - add left-arrow button at the beginning of settings header;
   - resolve target from last known chat for the active server (`/$serverId/$chatId`), fallback to `/$serverId`.
5. Gear toggle behavior:
   - update `ColumnHeaderGear` + navigation helpers so click acts as toggle:
     - if current route is not configurator: enter configurator as now;
     - if current route is configurator: exit to non-config chat route for active server.
6. Preserve existing tab initialization:
   - keep `initialSettingsTabForSource(source)` reset semantics on each entry.

## Acceptance Criteria
1. Config mode no longer shows an empty middle column.
2. Route-mode settings header contains a working server dropdown.
3. Selecting a server from dropdown changes URL to `/config/$serverId`.
4. Header left-arrow exits configurator to last chat or server route fallback.
5. Re-clicking gear on `/config*` exits configurator for active server.
6. Initial settings tab still resets according to gear source on configurator entry.

## Verification Scenario
1. Open designer shell with at least one server and navigate to configurator via gear.
2. Confirm settings panel occupies all space to the right of services column.
3. Open server dropdown in settings header and switch to another server; verify URL and content update.
4. Click back arrow; verify return to last chat for that server or server route fallback.
5. Re-enter configurator and click any gear again while on `/config*`; verify exit to chat mode.
6. Enter configurator from Services/Chats/Chat columns and verify initial tab is `main/configurator/users` respectively.

## Testing
Manual verification only in `apps/designer` UI:
- route transitions and URL checks;
- layout and header control behavior checks.

## Notes
Suggestion reference includes prior commit with dropdown behavior: `1e608ace0072a50ceaee669f1f5438f8c1a89234`. Use it only as orientation; implement against current route-based architecture.
