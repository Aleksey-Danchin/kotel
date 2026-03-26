# Step 04: Build settings overlay shell and role-based tab entry

## Goal
Implement a full-container settings overlay opened by header gears, with role-based tab availability and source-dependent default tab.

## Motivation
Settings must be globally reachable from all three columns, while permissions and entry points depend on the current user role and which gear was clicked.

## Type
feature, ui, architectural

## Affected Area
`apps/designer/src/components/ColumnHeaderGear.tsx`, `apps/designer/src/state/headerGear.ts`, `apps/designer/src/routes/~__root.tsx`, new settings state/components under `apps/designer/src/state/` and `apps/designer/src/components/` (or `apps/designer/src/routes/`), plus keyboard handling in root layout.

## Dependencies
Depends on step 01.

## Current Behavior
`ColumnHeaderGear` visibility is restricted by host+role logic and click has no functional effect. There is no settings shell, no tabs, and Esc always drives chat/server navigation.

## Expected Behavior
- Gear is always visible in headers of all three columns.
- Clicking gear opens an overlay centered in the same main container bounds as the chat layout.
- Overlay includes:
  - tab navigation;
  - close (`X`) control;
  - Esc close behavior.
- Default tab depends on source gear:
  - Services gear -> `основной`;
  - Chats gear -> `конфигуратор`;
  - Chat gear -> `пользователи`.
- Role access:
  - for current server ROOT/ADMIN: all 4 tabs;
  - all other cases (including ROOT/ADMIN on non-current server): only `аккаунт`.

## Specification
- Replace old `shouldShowColumnHeaderGear` behavior with unconditional rendering.
- Introduce settings UI state atom(s):
  - `isSettingsOpen`;
  - `settingsInitialTab`;
  - `settingsActiveTab`.
- Pass gear source context (`services|chats|chat`) from each column gear instance.
- Render overlay at root layout level (`~__root.tsx`) above columns, constrained to the same centered container width.
- Esc priority:
  - when settings overlay is open, Esc closes overlay and does not execute existing chat/server exit chain;
  - existing Esc chain remains unchanged when overlay is closed.
- Restrict tab list dynamically by selected server role and scope (current server vs others).

## Acceptance Criteria
1. All three column headers always show a clickable gear.
2. Clicking each gear opens settings overlay with the correct initial tab.
3. Non-ROOT/ADMIN users can open overlay but only see/use `аккаунт`.
4. ROOT/ADMIN on current server can access all four tabs, and on non-current server are restricted to `аккаунт`.
5. Esc closes settings overlay first; chat/server Esc navigation is suppressed while overlay is open.

## Verification Scenario
1. Open designer root and click gear in each column, verify initial tab mapping.
2. Switch user roles (mock servers) and verify tab availability changes.
3. Press Esc while overlay is open and verify only overlay closes.
4. Press Esc again with overlay closed and verify original navigation behavior still works.

## Testing
- Vitest unit tests for tab-access resolver and gear-source-to-initial-tab mapping.
- Manual keyboard and overlay behavior checks.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- Keep overlay implementation in sandbox UI layer; no router-level settings page is required.
