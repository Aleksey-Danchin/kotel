---

## step-imp — 2026-04-07T10:22:27+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/routes/~__root.tsx` — removed placeholder middle config column so settings panel uses full width to the right of services.
- `apps/designer/src/components/SettingsOverlay.tsx` — added route-mode back arrow exit, restored server dropdown in route mode, and wired route-mode server selection to `/config/$serverId`.
- `apps/designer/src/components/ColumnHeaderGear.tsx` — made gear button behavior toggle-aware: enters configurator from regular routes and exits configurator when already on `/config*`.
- `apps/designer/src/state/designerNavigation.ts` — added shared resolver for configurator exit target with last-chat and server fallback logic.

### Tests
- Task-specific: not applicable (manual verification only for `apps/designer`).
- Regression: not applicable (manual verification only for `apps/designer`).

### Acceptance Criteria
- [x] AC-1: Config mode has no empty middle column — verified by: code inspection of root route layout branch.
- [x] AC-2: Route-mode header has working server dropdown — verified by: code inspection of route-mode header dropdown rendering.
- [x] AC-3: Dropdown selection navigates to `/config/$serverId` — verified by: code inspection of route-mode dropdown `navigate` handler.
- [x] AC-4: Header back arrow exits configurator to last chat or server fallback — verified by: code inspection of back-button handler + shared exit target resolver.
- [x] AC-5: Gear re-click on `/config*` exits configurator — verified by: code inspection of `ColumnHeaderGear` toggle branch using configurator path detection.
- [x] AC-6: Initial tab reset-by-source semantics preserved on configurator entry — verified by: code inspection of unchanged `initialSettingsTabForSource` initialization on entry branch.

### Discoveries
- `docker compose` commands for this repo require environment variables (`PROJECT_ROOT`, `EXPO_PUBLIC_API_BASE_URL`), so container health verification in this run used `docker ps` name/status filtering.
