# Step 06: Add Users Page and E2E Flow Check

## Goal
Add a frontend `/users` page with an empty table and "загрузить" button, and implement data loading through the exact chain requested.

## Motivation
This verifies real connectivity across all layers and confirms backend + Prisma setup works in user-visible UI.

## Type
ui, feature

## Affected Area
`apps/frontend/src/routes/*` (new users route file), `apps/frontend/src/global/axiosLimitter.ts`, new axios client/query code under `apps/frontend/src/global` or route-local module, `apps/frontend/src/global/routeTree.gen.ts` (generated)

## Dependencies
Depends on step 05

## Current Behavior
- Frontend has basic routes only (`/`, `/$key`), no `/users`.
- `axiosLimitter` exists but there is no users API request flow.
- No table UI for backend users.

## Expected Behavior
- Route `/users` exists.
- Initial render shows empty table and button labeled exactly `загрузить`.
- Clicking button triggers flow:
  - button handler
  - TanStack Query invocation
  - `axiosLimitter` wrapper
  - axios GET `/api/users`
  - render response rows in table

## Specification
- Create route file using current route naming convention with `~` prefix (aligned with `tsr.config.json`).
- Add users query function:
  - uses axios instance/request
  - wrapped by `axiosLimitter` to enforce limiter participation
- Configure query as manual trigger (disabled by default; fetch on button click).
- Render table headers and rows for fields that remain available after omit:
  - `id`, `fullname`, `createdAt`, `updatedAt`
- Keep UI minimal but deterministic for manual verification.
- Ensure route tree generation is updated according to current project setup.

## Acceptance Criteria
1. Navigating to `/users` shows empty table and button `загрузить`.
2. No request is sent before click.
3. Click triggers API request to `/api/users` via axios limiter path.
4. Table renders 100 seeded users after successful response.
5. UI handles loading and request error states clearly (at least basic message/state).

## Verification Scenario
1. Start full dev environment and seed DB.
2. Open `https://kotel.localhost/users`.
3. Confirm table is initially empty.
4. Click `загрузить`.
5. Confirm network request `GET /api/users` succeeds.
6. Confirm table displays returned users.

## Testing
- Manual browser verification for interaction flow.
- Optional component/integration test for button-triggered fetch and row rendering.

## Notes
- Preserve existing React Query provider setup in `src/main.tsx`.
- Do not add pagination in this step; keep one-shot list loading for flow validation.
