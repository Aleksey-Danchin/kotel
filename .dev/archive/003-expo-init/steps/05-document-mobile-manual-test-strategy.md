# Step 05: Document mobile manual test strategy

## Goal
Add explicit project documentation for how to manually test the new Expo mobile flows and record the current decision to skip automated Expo E2E for now.

## Motivation
The team asked to postpone automated Expo testing and rely on manual verification. This must be codified to avoid ambiguity for future contributors.

## Type
docs, architectural

## Affected Area
`apps/mobile/README.md` and/or root `README.md` sections that describe dev startup and testing responsibilities.

## Dependencies
Depends on steps 01, 03, and 04.

## Current Behavior
`apps/mobile/README.md` still contains default create-expo-app template text and does not describe:
- docker-integrated startup;
- Android-emulator-only scope;
- users/session-test manual verification checklist;
- current stance on Playwright for native Expo.

## Expected Behavior
Documentation should clearly state:
- how to run mobile via project dev scripts/compose;
- supported runtime target for this scope (Android emulator);
- manual test scenarios for `users` and `session-test` tabs;
- automated Expo testing is intentionally deferred;
- Playwright remains for web E2E in this repo and is not used for native Expo flow in current scope.

## Specification
Update mobile-oriented docs with concise, actionable sections:
- **Run instructions**: start command, attached terminal expectation, stop commands.
- **Environment/networking**: required host IP and API routing assumptions used by mobile client.
- **Manual checklist**:
  - users: load action, loading/error/data render;
  - session-test: signin/check/signout and JSON state transitions.
- **Testing policy note**:
  - manual testing only for Expo native app at this stage;
  - no Playwright native mobile E2E in current implementation scope;
  - existing Playwright coverage remains web-focused.

Keep wording factual and avoid speculative tool comparisons, since decision is already made for this phase.

## Acceptance Criteria
1. Mobile README no longer looks like untouched Expo template for project-specific usage.
2. Documentation includes exact run/stop flow for docker-integrated mobile development.
3. Documentation includes explicit manual test checklist for both new tabs.
4. Documentation explicitly records that Expo native automated testing is out of scope for now.
5. Documentation clarifies Playwright usage boundary (web E2E only in this repo context).

## Verification Scenario
1. Open updated docs from a clean terminal session.
2. Follow run instructions exactly and confirm they match real behavior.
3. Execute manual checklist in emulator and confirm each expected result is observable.
4. Confirm testing policy section is unambiguous for future contributors.

## Testing
Docs verification only (manual):
- runbook accuracy;
- checklist completeness;
- consistency with implemented behavior from previous steps.

## Notes
If documentation is split between root and mobile README, keep one source as canonical and cross-link to avoid divergence.
