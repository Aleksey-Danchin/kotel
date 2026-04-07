# Step 01: Align Testing Rules For Designer Sandbox

## Goal
Update AI workspace rules so `apps/designer` is explicitly treated as a manual UI sandbox without automated test requirements, while automated testing requirements remain mandatory for `apps/frontend` and `apps/backend`.

## Motivation
Current rule guidance conflicts with the intended role of designer as a sandbox. This causes repeated generation and maintenance of tests in a module that should prioritize quick UI prototyping.

## Type
infra, architectural

## Affected Area
`.cursor/rules/testing.mdc`, `.cursor/rules/designer.mdc`

## Dependencies
None

## Current Behavior
`testing.mdc` is globally applied and states that all non-E2E automated tests must use Vitest, with no explicit exclusion for `apps/designer`. `designer.mdc` describes sandbox constraints but does not clearly prohibit maintaining automated tests in `apps/designer`.

## Expected Behavior
Rules clearly state:
- automated testing policy is enforced for `apps/frontend` and `apps/backend`;
- `apps/designer` is excluded from automated test obligations and validated manually.

## Specification
1. Update `.cursor/rules/testing.mdc` so its testing mandate is scoped to frontend/backend application code and not interpreted as a requirement for `apps/designer`.
2. Update `.cursor/rules/designer.mdc` with an explicit rule that automated tests are not maintained in `apps/designer`; verification in designer is manual.
3. Keep consistency between both files so they do not contradict each other.
4. Preserve existing DTO/Zod guidance in `testing.mdc` for backend contracts unchanged.
5. Add wording that prevents future re-introduction of designer test expectations by default agents.

## Acceptance Criteria
1. `testing.mdc` text unambiguously scopes mandatory automated testing to `apps/frontend` and `apps/backend`.
2. `designer.mdc` explicitly says automated tests are not required/maintained for `apps/designer`.
3. There is no conflicting instruction between these two rule files regarding designer testing.
4. Existing non-designer testing requirements remain intact.

## Verification Scenario
1. Open `.cursor/rules/testing.mdc` and verify it no longer implies mandatory tests for `apps/designer`.
2. Open `.cursor/rules/designer.mdc` and verify explicit "manual-only verification / no automated tests" guidance exists.
3. Compare both files and confirm they provide one coherent policy.

## Testing
Manual verification only:
- review rendered markdown content of both rule files;
- validate policy consistency by reading both files end-to-end.

## Notes
This step is a policy foundation for later cleanup and UI steps. Implementing agents should follow these updated rules in subsequent steps.
