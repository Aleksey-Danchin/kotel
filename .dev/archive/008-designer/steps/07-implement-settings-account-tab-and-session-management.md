# Step 07: Implement Account settings tab and session management

## Goal
Create the `аккаунт` tab with self-profile editing, admin self-demotion flow, and active-session controls with per-session deletion confirmation.

## Motivation
The account tab is the only settings surface available for non-admin roles and must provide complete self-service account and session controls in sandbox mode.

## Type
feature, ui

## Affected Area
Settings overlay account tab components, `apps/designer/src/state/store.ts` selectors/mutators for sessions and current user, `apps/designer/src/state/mocks.json` session usage, optional shared modal components.

## Dependencies
Depends on steps 01 and 04.

## Current Behavior
No account tab exists, no self-profile editing UI, no session list/actions, and no admin self-demotion control.

## Expected Behavior
Account tab includes:
- editable own `login`, `fullname`, `password`;
- `Сохранить` button for account form changes;
- for `ADMIN`, button `Перестать быть админом` with confirmation modal;
- block `Завершить сессию` with 3 actions:
  - `Завершить текущую сессию`;
  - `Завершить все сессии`;
  - `Завершить все сессии, кроме текущей`;
- list of active sessions with lifetime based on `createdAt`;
- delete (`X`) per non-current session with confirmation modal;
- no delete icon for current session.

## Specification
- Session model uses `sessions: { id, serverId, createdAt }[]`.
- Determine current session by selected server relation (`serverId` equals active server).
- Compute displayed lifetime as "how long session exists" from `createdAt` (not expires-at TTL).
- Implement all session actions as local state mutations:
  - current only;
  - all;
  - all except current;
  - single session delete via confirm.
- Admin demotion:
  - show button only when current user role is ADMIN;
  - require confirmation modal;
  - after demotion, role becomes USER in local store.

## Acceptance Criteria
1. Account tab allows editing current user profile fields and has a working `Сохранить` action.
2. ADMIN sees self-demotion action with confirmation flow.
3. Session block renders three bulk actions and session list with computed lifetime from `createdAt`.
4. Current session row has no delete icon; non-current rows have delete with confirmation modal.
5. Session action buttons and row delete mutate local session list as expected.

## Verification Scenario
1. Open account tab as ADMIN, trigger demotion modal, confirm, verify role changes locally.
2. Verify only account tab remains accessible after demotion (per step 04 role policy).
3. Use each bulk session action and verify list updates.
4. Delete a non-current session through modal confirmation and verify removal.

## Testing
- Vitest for session action reducers/selectors and current-session detection.
- Manual UI verification for modal confirmations and role transition effects.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.
<CORRECTION by="step-executor" reason="testing policy requires automated verification">
Runtime behavior in this step must be verified by automated Vitest tests (unit/component) where feasible; `cursor-ide-browser` can be used only for selector reconnaissance/debugging and not as acceptance verification.
</CORRECTION>

## Notes
- Keep all behavior sandbox-local and persistence-compatible.
