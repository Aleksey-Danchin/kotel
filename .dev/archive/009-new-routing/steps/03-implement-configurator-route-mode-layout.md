# Step 03: Implement configurator route-mode layout

## Goal
Implement configurator as a route-driven screen mode (`/config` and `/config/:serverId`) without using the existing modal overlay pattern.

## Motivation
The requested UX requires configurator to be addressable and shareable by URL, including a no-server state with explicit empty-column behavior.

## Type
ui, feature, refactor

## Affected Area
`apps/designer/src/routes/~__root.tsx`, `apps/designer/src/routes/ServicesColumn.tsx`, `apps/designer/src/routes/ChatsColumn.tsx`, `apps/designer/src/routes/ChatColumn.tsx`, `apps/designer/src/components/SettingsOverlay.tsx`, `apps/designer/src/state/settingsOverlay.ts`, `apps/designer/src/components/ColumnHeaderGear.tsx`

## Dependencies
Depends on steps 01 and 02.

## Current Behavior
Configurator is represented by `SettingsOverlay` opened from gear buttons, not by route. There is no `/config...` path mode and no dedicated "Выберите сервер" state in the main layout.

## Expected Behavior
- `/config` activates configurator mode with no selected server:
  - left column is empty
  - right/main area shows centered text: "Выберите сервер"
- `/config/:serverId` activates configurator mode for a specific server.
- Unknown `:serverId` under config behaves like `/config`.
- Configurator behavior no longer depends on opening modal overlay from current route.

## Specification
- Rework root layout rendering to branch between:
  - regular chat shell mode
  - configurator route mode
- In configurator route mode:
  - replace modal usage with in-layout content
  - render tabbed configurator UI in main pane using selected server (if valid)
  - when server is absent, render the agreed centered message state
- Keep role-based tab visibility and existing configurator forms, but host them in route-mode container.
- Define clear interaction contract for server column while in `/config`:
  - selecting server should navigate to `/config/:serverId`
  - leaving config mode should return to non-config routes (handled in step 04 navigation wiring)
- De-scope or retire `isSettingsOpenAtom` modal toggle flow where it becomes obsolete; preserve only what remains needed by route-mode configurator.

## Acceptance Criteria
1. Visiting `/config` shows configurator mode with empty left column and centered "Выберите сервер" in main area.
2. Visiting `/config/:serverId` with a valid server shows configurator for that server.
3. Visiting `/config/:serverId` with an invalid server shows the same state as `/config`.
4. Configurator is rendered as page content, not as modal overlay.
5. Existing configurator tabs and forms remain available according to role permissions.

## Verification Scenario
1. Open `/config` directly in browser address bar.
2. Verify no server is selected and main pane shows centered "Выберите сервер".
3. Select a server from services list and verify URL becomes `/config/:serverId`.
4. Verify configurator content appears for selected server.
5. Enter `/config/unknown-server` manually and verify fallback to `/config` behavior.

## Testing
- Add component/integration tests (Vitest + React testing stack used in project) for:
  - `/config` empty state rendering
  - `/config/:serverId` valid and invalid server handling
  - role-based tab rendering in route-mode configurator
- Add regression tests ensuring no modal-open state is required for configurator route rendering.

## Notes
- Keep user-facing text exactly "Выберите сервер" for the `/config` empty state.
- `/callback` remains intact for OAuth flow and must not be affected by configurator route additions.
