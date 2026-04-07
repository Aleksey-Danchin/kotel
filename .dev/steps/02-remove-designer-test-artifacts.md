# Step 02: Remove Designer Test Artifacts

## Goal
Remove existing automated tests and local test infrastructure from `apps/designer` so the sandbox no longer contains test suites or test entrypoints.

## Motivation
Designer is intended for UI prototyping and manual UX validation. Keeping local test suites there creates maintenance overhead and repeatedly conflicts with sandbox policy.

## Type
refactor, infra

## Affected Area
`apps/designer/src/**/*.test.ts`, `apps/designer/src/**/*.test.tsx`, `apps/designer/package.json`, `apps/designer/vitest.config.ts`, any designer-local test references

## Dependencies
Depends on steps 01

## Current Behavior
`apps/designer/src` contains multiple `*.test.ts` and `*.test.tsx` files, `apps/designer/package.json` includes a `test` script, and `apps/designer/vitest.config.ts` configures local Vitest runs.

## Expected Behavior
`apps/designer` contains no local test files and no local test command/config that implies maintaining automated tests in this sandbox.

## Specification
1. Delete all `*.test.ts` and `*.test.tsx` files under `apps/designer/src`.
2. Remove the local `test` script from `apps/designer/package.json`.
3. Remove `apps/designer/vitest.config.ts` if it is no longer used.
4. Clean up designer-local references that directly point to removed local tests/config.
5. Do not modify monorepo root pipelines unless they explicitly and incorrectly target designer tests; if such references exist, remove only designer-specific links while preserving frontend/backend pipelines.

## Acceptance Criteria
1. `apps/designer/src` contains zero `*.test.ts` and `*.test.tsx` files.
2. `apps/designer/package.json` has no `test` script for Vitest.
3. `apps/designer/vitest.config.ts` is removed or not required by any remaining designer command.
4. No local documentation or scripts in `apps/designer` instruct running automated tests there.

## Verification Scenario
1. Search `apps/designer/src` for `*.test.ts*` files and verify no results.
2. Open `apps/designer/package.json` and verify absence of `"test": ...`.
3. Confirm `apps/designer/vitest.config.ts` is absent (or unused if intentionally kept for a justified reason).
4. Search repo references to designer test execution and confirm no active automation path remains for designer.

## Testing
Manual verification only:
- file presence checks;
- script/config inspection.

## Notes
Keep frontend/backend test tooling unchanged. This step is intentionally scoped to designer-local test artifacts.
