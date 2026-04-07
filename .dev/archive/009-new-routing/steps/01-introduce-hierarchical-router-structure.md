# Step 01: Introduce hierarchical router structure

## Goal
Replace the current single dynamic route model with explicit hierarchical routes for server/chat selection and configurator mode.

## Motivation
The current URL contract in `apps/designer` supports only `/$id`, which mixes server and chat concerns and cannot represent configurator mode as a first-class route.

## Type
architectural, ui, refactor

## Affected Area
`apps/designer/src/routes/**`, `apps/designer/src/global/routeTree.gen.ts`, `apps/designer/tsr.config.json`, `apps/designer/src/global/router.ts`

## Dependencies
None.

## Current Behavior
Routing is centered on `/$id` and `/` only, with static pages (`/setup`, `/users`, `/session-test`, `/callback`) handled separately. Route parsing logic and navigation assume a single dynamic segment.

## Expected Behavior
Router supports and resolves the following URL contract:
- `/` -> home, nothing selected
- `/:serverId` -> server selected; unknown server falls back to `/` behavior
- `/:serverId/:chatId` -> server + chat selected; unknown chat falls back to `/:serverId`; unknown server falls back to `/`
- `/config` -> configurator mode without server selection
- `/config/:serverId` -> configurator mode with selected server; unknown server falls back to `/config`

Static routes `/setup`, `/users`, `/session-test`, and `/callback` remain available.

## Specification
- Replace file-based route layout so TanStack Router generates explicit routes for:
  - root/home
  - server-only selection
  - server+chat selection
  - configurator root and configurator-with-server
- Remove dependency on the legacy `/$id` route as a primary entrypoint.
- Ensure route naming and path definitions are unambiguous with reserved `config` semantics:
  - exact `/config` and `/config/:serverId` are configurator routes
  - `/:serverId` remains dynamic for all other first segments
- Keep existing static routes untouched and still prioritized where exact static match exists.
- Regenerate route tree artifacts and verify type-safe navigation signatures are updated across the app.

## Acceptance Criteria
1. Route tree contains explicit entries for `/`, `/:serverId`, `/:serverId/:chatId`, `/config`, and `/config/:serverId`.
2. Legacy single-segment chat/server route `/$id` is no longer the primary dynamic route contract.
3. Static routes `/setup`, `/users`, `/session-test`, and `/callback` continue to resolve exactly as before.
4. TypeScript route types compile without manual `any` workarounds for new route definitions.

## Verification Scenario
1. Start `apps/designer` dev server.
2. Open `/` and verify root layout renders with no selected server/chat.
3. Open a valid `/:serverId` URL and verify route resolves without redirect loops.
4. Open `/config` and `/config/:serverId` and verify both routes resolve.
5. Open `/setup`, `/users`, `/session-test`, and `/callback` and verify each still renders.

## Testing
- Add/adjust route-level tests (Vitest) validating route parsing and precedence for dynamic vs static/config paths.
- Add a regression test ensuring `/config` is treated as a special route, not generic `:serverId`.
- Run designer test suite in `apps/designer` with Vitest.

## Notes
- Do not preserve backward compatibility for old `/:id` semantics from the previous single-level routing model.
- Avoid editing generated `routeTree.gen.ts` manually; regenerate via the existing TanStack Router workflow.
