# Step 05: Implement General and Configurator settings tabs

## Goal
Implement the `основной` and `конфигуратор` tab content with save actions in the settings overlay.

## Motivation
Core server-level settings require editable server display name and a placeholder configurator form to complete the tab framework.

## Type
feature, ui

## Affected Area
Settings overlay components introduced in step 04, `apps/designer/src/state/servers.ts`, `apps/designer/src/components/ServerCard.tsx`, any shared settings form helpers.

## Dependencies
Depends on steps 01 and 04.

## Current Behavior
No settings tabs exist, server cards derive display title from URL host, and configurator controls are absent.

## Expected Behavior
- `основной` tab:
  - editable server name (`server.name`);
  - `Сохранить` button persists locally and updates server card label.
- `конфигуратор` tab:
  - disabled request-frequency field;
  - `Сохранить` button present.

## Specification
- Extend `ServerSession` model and persistence in `servers.ts` to include `name`.
- In server rendering (`ServerCard`), use `state.name` as primary label, fallback to parsed host only for legacy entries.
- General tab:
  - form with single `name` input;
  - save applies to currently selected server and persists through existing local-storage path.
- Configurator tab:
  - minimal form as confirmed: one disabled input (`Частота отправки запросов`) + save button.
  - no backend wiring; save can be no-op or local draft commit but UI must stay functional.
- Both tabs should visually align with DaisyUI form conventions.

## Acceptance Criteria
1. General tab allows editing server name and saving it.
2. Saved server name is reflected in `ServerCard` and survives refresh (via existing local persistence).
3. Configurator tab contains disabled frequency field and save button.
4. Both tabs are accessible only when role policy from step 04 allows them.

## Verification Scenario
1. Open settings from services gear as ROOT/ADMIN.
2. In `основной`, change server name and save.
3. Close settings and verify server card shows new name.
4. Reopen configurator tab and verify disabled field + save button exist.

## Testing
- Vitest for server state persistence with new `name` field.
- Manual UI checks for form save and server card label updates.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- Keep backward compatibility for previously persisted server objects without `name`.
