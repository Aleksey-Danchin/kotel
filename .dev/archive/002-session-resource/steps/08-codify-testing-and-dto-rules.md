# Step 08: Codify Testing and DTO Rules

## Goal
Create persistent project rules and documentation that enforce the selected testing stack (Vitest + Playwright) and Zod-first DTO policy.

## Motivation
The team explicitly decided on tool and architecture conventions for this round. These conventions must be documented in machine-readable project rules to guide future agents and contributors.

## Type
architectural, infra, docs

## Affected Area
`.cursor/rules/testing.mdc` (new), related documentation files (`README.md` and/or app READMEs if chosen by implementation scope), backend docs about DTO validation approach

## Dependencies
Depends on steps 02, 03

## Current Behavior
No project rule files currently define testing or DTO policy. Existing README files are mostly template text.

## Expected Behavior
Project rules clearly state:
- Automated testing stack: Vitest (all non-E2E), Playwright (E2E).
- Backend no longer uses Jest.
- Zod is the primary and currently only DTO validation method.

## Specification
- Create `.cursor/rules/testing.mdc` and include:
  - mandatory testing stack policy
  - explicit prohibition of adding new Jest-based tests
  - guidance for backend endpoint tests to run in test environment
- Add DTO policy note (in the same rule file or companion docs per repository style):
  - Zod as primary DTO mechanism
  - expectation for new backend request validation to use Zod schemas
  - alias/import convention for consuming shared backend-defined contract artifacts from frontend when required
- Update at least one human-readable project doc to reference these rules so developers discover them quickly.

## Acceptance Criteria
1. `.cursor/rules/testing.mdc` exists and contains explicit Vitest/Playwright policy.
2. Rule text explicitly disallows new Jest usage.
3. Rule/docs explicitly define Zod-first DTO policy for backend contracts.
4. Documentation references are discoverable from main project docs.

## Verification Scenario
1. Open `.cursor/rules/testing.mdc` and verify testing policy language.
2. Verify Zod DTO policy is documented.
3. Open updated README/document and confirm it references the new rules.

## Testing
- Documentation validation (manual review for completeness/clarity).
- Optional lint/format check for rule/docs files if repository enforces it.

## Notes
- Keep the rule concise but strict enough for autonomous agents.
