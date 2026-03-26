# Step 06: Implement Users settings tab and user creation modal

## Goal
Build the `пользователи` settings tab with two-column editor, role-aware edit restrictions, and add-user modal with password generation.

## Motivation
User administration is a key part of the requested settings experience and must support sandbox editing rules for roles, blocked state, and controlled creation.

## Type
feature, ui, data-model

## Affected Area
Settings overlay tab components, `apps/designer/src/state/store.ts` (user selectors/mutators), `apps/designer/src/state/mocks.json` shape usage, possibly `apps/designer/src/state/servers.ts` if current user updates are mirrored.

## Dependencies
Depends on steps 01 and 04.

## Current Behavior
There is no users tab in settings; no user editor, no add-user modal, and no mutation rules for ROOT/ADMIN.

## Expected Behavior
Users tab includes:
- header with control buttons (currently only `Добавить пользователя`);
- two-column layout: users list + selected user editor;
- editable fields: `login`, `fullname`, `password`, `blocked`, `role`;
- disabled request-frequency field in editor;
- `Сохранить` action for editable users;
- add-user modal (`login + fullname + password`) with generator button (12 chars `[A-Za-z0-9]`), `Создать` and `Отмена`.

## Specification
- Left column:
  - list users linked to selected server (`serverUsers`);
  - selection controls which user is shown in right editor.
- Right column editor:
  - fields per requirement;
  - role options: `ADMIN`, `USER`, `ROOT`;
  - ROOT role change is always forbidden.
- Permission matrix:
  - ADMIN cannot edit ROOT users at all;
  - ROOT can edit ROOT users except role;
  - save only enabled when current role allows editing.
- Add-user modal:
  - validation for required fields;
  - password generator inserts generated value and allows manual edits;
  - create operation adds user to global `users` and current server links in `serverUsers`.
- Keep all mutations local to designer store.

## Acceptance Criteria
1. Users tab renders two-column management UI with add button in header.
2. User editor supports required fields and role dropdown values.
3. ROOT role cannot be changed by anyone.
4. ADMIN cannot edit ROOT users; ROOT can edit ROOT users except role.
5. Add-user modal creates a new server-linked user and generated password behavior matches the confirmed format.

## Verification Scenario
1. Open users tab as ADMIN and select ROOT user; verify editing is disabled.
2. Open users tab as ROOT and select ROOT user; verify editable fields except role.
3. Open add-user modal, generate password, adjust value, create user.
4. Verify new user appears in users list and can be selected in editor.

## Testing
- Vitest for role-based editability resolver and password generator constraints.
- Manual modal flow test for create/cancel and resulting list updates.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- `/users` route is out of scope for reuse; keep this as settings-only implementation.
