# Step 04: Implement mobile session-test tab

## Goal
Implement a `session-test` tab in mobile that reproduces frontend session diagnostic flow 1:1: fixed signin credentials, check action, signout action, request status, error output, and JSON session state display.

## Motivation
Session handling is a critical backend integration path. The mobile app needs the same quick diagnostics already available in frontend for manual verification.

## Type
feature, ui, backend

## Affected Area
`apps/mobile/app/(tabs)/session-test.tsx` (new), `apps/mobile/app/(tabs)/_layout.tsx`, mobile session API module(s), mobile session Jotai atoms/state module(s).

## Dependencies
Depends on steps 02 and 03.

## Current Behavior
Mobile app has no session diagnostic screen.  
Frontend reference is `apps/frontend/src/routes/~session-test.tsx`, which provides:
- `signin` with fixed payload `{ login: "user1", password: "123" }`;
- `check` request to fetch current session user;
- `signout` request;
- transient request status;
- error text and JSON dump of current session state.

## Expected Behavior
Mobile `session-test` tab should mirror that behavior:
- same three actions (`signin`, `signout`, `check`);
- same fixed signin credentials for this scope;
- same semantics for status/error/session-state display;
- session state stored via Jotai atoms (frontend parity requirement from Q&A).

## Specification
Create mobile session API module using shared Axios client:
- `signin(input)` -> POST to session signin contract path;
- `signout()` -> POST to signout path;
- `check()` -> GET current session.

If feasible in mobile build setup, reuse shared backend contract constants/types from `@contracts/session`; otherwise define a temporary mirror with clear TODO note for future unification.

Create Jotai atoms for session state and session error:
- `sessionUserAtom` with nullable session user object;
- `sessionErrorAtom` with nullable string.

Implement `app/(tabs)/session-test.tsx`:
- wire React Query mutation/query hooks with same control flow as frontend reference;
- on signin success: set session user and clear error;
- on signout success: clear session user and error;
- on check error: set formatted error and keep state consistent;
- render "request in progress" status when any operation is running;
- render session JSON using formatted string output.

Update tabs registration:
- add `session-test` tab entry with clear title.

## Acceptance Criteria
1. `session-test` tab exists and is reachable in mobile tabs.
2. Tapping `signin` sends fixed credentials `user1/123`.
3. `check` and `signout` actions work and update local session state correctly.
4. In-flight status and error messages are visible in UI.
5. Session state is rendered as JSON and reflects the latest operation result.
6. Session state uses Jotai atoms in mobile implementation.

## Verification Scenario
1. Start stack and open Android emulator via Expo.
2. Open `session-test` tab.
3. Tap `signin`; verify pending status then JSON with authenticated user.
4. Tap `check`; verify same authenticated user remains visible.
5. Tap `signout`; verify session JSON becomes `null`.
6. Trigger backend failure and verify error message rendering.

## Testing
Manual-only in Android emulator:
- signin success path;
- check path after signin;
- signout path;
- error rendering path.

No automated test implementation is required for this step.

## Notes
Because automated Expo testing is explicitly out of scope, prioritize deterministic UI state transitions and readable debug output for manual sessions.
