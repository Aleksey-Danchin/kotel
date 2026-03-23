# Step 02: Migrate Backend Tests to Vitest

## Goal
Replace Jest-based backend testing with Vitest and remove obsolete generated/spec tests that are no longer relevant to the session-focused workflow.

## Motivation
The project policy for this round is strict: automated testing must use Vitest (unit/integration) and Playwright (E2E). Current backend tests are Jest-based and mostly scaffold-level checks that do not validate real runtime behavior.

## Type
infra, refactor, backend

## Affected Area
`apps/backend/package.json`, backend test configuration files (new/updated), `apps/backend/src/**/*.spec.ts`, TypeScript config files for backend tests, lockfiles if dependency graph changes

## Dependencies
Depends on steps 01

## Current Behavior
Backend currently uses Jest:
- `apps/backend/package.json` has Jest scripts (`test`, `test:watch`, `test:cov`, `test:e2e`) and Jest dependencies.
- Existing specs include:
  - `apps/backend/src/app.controller.spec.ts`
  - `apps/backend/src/prisma/prisma.service.spec.ts`
  - `apps/backend/src/prisma/prisma.factory.definition.spec.ts`
  - `apps/backend/src/users/users.integration.spec.ts`
These tests are mostly generated/smoke and not aligned with real DB test requirements.

## Expected Behavior
Backend tests are run via Vitest only. Jest dependencies/config are removed. Legacy irrelevant specs are removed and replaced by meaningful Vitest suites in later steps.

## Specification
- Update backend test tooling:
  - remove Jest-specific dependencies and scripts from `apps/backend/package.json`
  - add Vitest-compatible scripts (`test`, watch variant if desired, CI/non-watch command)
  - configure test environment for NestJS + Supertest style integration tests under Vitest
- Add/adjust backend test config:
  - Vitest config file for backend (`vitest.config.*`) with Node environment
  - path alias support equivalent to current `moduleNameMapper` behavior for `~prisma/*`
  - setup files if needed for globals/cleanup
- Delete obsolete test files listed above (or all preexisting backend `*.spec.ts` that match current non-relevant scaffold checks).
- Ensure migration does not block upcoming real endpoint integration tests that rely on running test compose stack.

## Acceptance Criteria
1. Backend has no active Jest runtime dependency or Jest scripts.
2. Vitest runs successfully in backend context.
3. All obsolete scaffold-style backend spec files are removed.
4. Backend test command exits correctly in CI mode (non-watch).

## Verification Scenario
1. Run backend install/update to apply dependency changes.
2. Execute backend test command via Vitest.
3. Verify removed Jest tests are not present.
4. Confirm no Jest config is required for backend test execution anymore.

## Testing
- Execute backend Vitest command directly and through `scripts/test-run.sh`.
- Verify path alias imports resolve in tests.
- Confirm no residual Jest command is referenced by scripts/docs.

## Notes
- Keep frontend tooling unchanged unless backend test migration requires workspace-level script updates.
- This step intentionally removes old tests before introducing new session coverage.
