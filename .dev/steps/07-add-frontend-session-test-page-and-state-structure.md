# Step 07: Add Frontend Session Test Page and State Structure

## Goal
Add a temporary frontend page for manual session flow checks and establish the requested frontend data-access structure with `api` and `queryOptions` directories plus Jotai state for session data.

## Motivation
The backend session API needs a quick manual UI harness for signin/signout/check validation. This round also sets baseline frontend conventions for API/query organization and state store direction.

## Type
ui, feature, refactor

## Affected Area
`apps/frontend/src/routes/*`, `apps/frontend/src/api/*.ts` (new), `apps/frontend/src/queryOptions/*.ts` (new), Jotai setup files (new/updated), existing `apps/frontend/src/global/usersApi.ts` migration points, frontend dependencies

## Dependencies
Depends on steps 03, 05

## Current Behavior
Frontend has only basic pages (`/`, `/users`) and current API call lives in `src/global/usersApi.ts`. No session test UI, no Jotai usage, and no dedicated `api`/`queryOptions` folders.

## Expected Behavior
- A dedicated route `/session-test` exists with buttons for `signin`, `signout`, and `check`.
- Page shows response state for manual verification.
- Session user/state from `check` is stored in Jotai atoms (within this test-page scope).
- API calls and TanStack Query options are organized in flat resource-based files:
  - `src/api/<resource>.ts`
  - `src/queryOptions/<resource>.ts`

## Specification
- Install `jotai` in frontend.
- Create session API file(s) under `src/api` for:
  - `signin`
  - `signout`
  - `check`
- Create query option builder(s) under `src/queryOptions` for session resource.
- Refactor current users API placement to match new structure (resource-based, flat files).
- Add route `/session-test`:
  - includes 3 action buttons (`signin`, `signout`, `check`)
  - includes result/diagnostic area for current user/session state and errors
  - uses query/mutation patterns consistent with TanStack Query
  - persists check result in Jotai atom(s)
- Keep implementation intentionally simple; this page is temporary and can prioritize clarity over optimization.

## Acceptance Criteria
1. Frontend has `jotai` dependency and active atom usage for session state.
2. `/session-test` route is reachable and contains signin/signout/check controls.
3. `src/api` and `src/queryOptions` directories exist with resource-based flat files.
4. Session test page uses new API/queryOptions structure.
5. Existing users API access is migrated away from `src/global/usersApi.ts` to new structure.

## Verification Scenario
1. Open frontend and navigate to `/session-test`.
2. Trigger signin and verify user appears in result section.
3. Trigger check and verify Jotai-backed state updates.
4. Trigger signout and verify state becomes unauthenticated.
5. Confirm API modules are imported from `src/api` and query options from `src/queryOptions`.

## Testing
- Manual verification only for frontend session test page (as requested).
- Ensure backend endpoint tests remain automated in Vitest.

## Notes
- Do not introduce frontend automated tests for this temporary page in this round.
