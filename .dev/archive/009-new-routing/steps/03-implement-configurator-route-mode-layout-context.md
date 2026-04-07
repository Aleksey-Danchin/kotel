---

## step-imp — 2026-04-06T13:08:01+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/routes/~__root.tsx` — split root layout into chat shell mode and configurator route mode; render inline configurator or centered "Выберите сервер" on `/config`.
- `apps/designer/src/routes/ServicesColumn.tsx` — server selection now preserves configurator mode by navigating to `/config/:serverId` when current route is `/config...`.
- `apps/designer/src/components/SettingsOverlay.tsx` — added `mode` prop and route-mode rendering that does not depend on `isSettingsOpenAtom`.
- `apps/designer/src/state/designerNavigation.ts` — added `enterConfigServer()` and `isConfiguratorPath()` helpers.
- `apps/designer/src/state/designerNavigation.test.ts` — added tests for configurator route detection helper.
- `apps/designer/src/components/SettingsOverlay.test.tsx` — added regression tests proving route-mode configurator renders without modal-open state.
- `apps/designer/vitest.config.ts` — expanded test include pattern to pick up `.test.tsx`.

### Tests
- Task-specific: 26 passed, 0 failed
- Regression: 56 passed, 5 failed (pre-existing failures in `chatThreadScrollLogic`, `chatMessageTimeline`, `store.sessions`)

### Acceptance Criteria
- [x] AC-1: Visiting `/config` shows empty second column and centered "Выберите сервер" state in main pane — verified by: code inspection of `~__root.tsx`.
- [x] AC-2: Visiting `/config/:serverId` with valid server shows configurator for that server — verified by: route-mode rendering in `~__root.tsx` + `SettingsOverlay.test.tsx`.
- [x] AC-3: Visiting `/config/:serverId` with invalid server behaves like `/config` — verified by: existing passing `store.test.ts` route-context fallback test.
- [x] AC-4: Configurator is page content, not modal overlay — verified by: removal of global overlay mount in root + `SettingsOverlay.test.tsx` (`mode="route"` renders while `isSettingsOpen=false`).
- [x] AC-5: Role-based tabs/forms remain available — verified by: existing passing `settingsOverlay.test.ts` and unchanged `resolveSettingsTabsForSession` flow used in route mode.

### Discoveries
- `scripts/prettier.sh` referenced by step workflow is absent in this repository; step uses existing project formatting/test scripts instead.
