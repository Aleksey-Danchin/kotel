# Step 09: Wire Shared Contract Aliases and Session Envs

## Goal
Add explicit workspace-level wiring for shared backend contract imports and required session environment variables in both dev and test runtime paths.

## Motivation
Several earlier steps rely on cross-package imports and new env-driven session behavior. Without explicit alias and env plumbing, implementation can compile or run inconsistently across backend, frontend, and compose scripts.

## Type
architectural, infra, backend, ui

## Affected Area
Root/workspace TypeScript config files, frontend Vite alias config, backend TS alias config, env files/templates, `infra/compose/dev.yml`, `infra/compose/test.yml`, `scripts/test-start.sh`

## Dependencies
Depends on steps 01, 03, 04, 07

## Current Behavior
Current project wiring is minimal:
- backend references `~prisma/*` alias and no session env variables yet
- frontend imports local modules only
- compose manifests do not pass session-specific env values (`IDLE_TIMEOUT`, cookie domain)

## Expected Behavior
Shared contracts and schemas required by frontend can be imported through explicit configured aliases, and every runtime mode (dev/test) injects consistent session env settings.

## Specification
- Define and document concrete alias strategy for frontend consumption of backend contract artifacts.
  - configure TS path aliases and bundler aliases consistently
  - ensure no fragile relative path imports across app boundaries
- Add required session env variables to runtime plumbing:
  - `SESSION_COOKIE_DOMAIN` (or chosen exact name)
  - `IDLE_TIMEOUT` (seconds)
  - any additional session guard/cookie config needed by implementation
- Pass these env vars through:
  - backend service in `infra/compose/dev.yml`
  - backend service in `infra/compose/test.yml`
  - scripts that bootstrap test stack (`test-start.sh`) where values are sourced/validated
- Provide sane defaults for development and deterministic values for test runs.
- Ensure the alias/env setup is reflected in docs/rules where contract usage is described.

## Acceptance Criteria
1. Frontend-to-backend shared contract alias imports resolve in typecheck and runtime build.
2. Dev backend receives session env variables needed by cookie + timeout behavior.
3. Test backend receives the same variables with test-safe values.
4. Missing required session env values fail fast with clear error.
5. Documentation references exact variable names and alias usage conventions.

## Verification Scenario
1. Start dev stack and verify backend logs/config confirm session env values are loaded.
2. Build/typecheck frontend with shared contract imports enabled.
3. Start test stack and verify session endpoints respect timeout/domain config.
4. Run tests to confirm no alias-resolution/runtime env failures.

## Testing
- Typecheck/build verification for frontend and backend.
- Smoke API checks for cookie domain/path behavior in both dev and test.
- Automated backend tests that exercise timeout behavior with configured env values.

## Notes
- Keep naming stable once introduced; follow-up renames are expensive across scripts, compose, and docs.
