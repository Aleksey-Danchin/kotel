# Step 27: E2E Playwright tests — OAuth web flow

## Goal
Write Playwright E2E tests covering the full OAuth web flow: server add via popup, session verification, refresh, logout, and the setup page.

## Motivation
E2E tests verify the complete client-server integration: popup mechanics, cookie delivery, token refresh, and multi-server interactions.

## Type
test, e2e

## Affected Area
- `apps/frontend/e2e/auth/` — new directory
- `apps/frontend/e2e/auth/oauth-flow.spec.ts` — new file
- `apps/frontend/e2e/auth/session-lifecycle.spec.ts` — new file
- `apps/frontend/e2e/auth/setup-flow.spec.ts` — new file

## Dependencies
Depends on all frontend and backend steps (Steps 01-20, 24).

## Current Behavior
Old E2E tests deleted in Step 03. No E2E coverage for new auth system.

## Expected Behavior

### OAuth flow test (`oauth-flow.spec.ts`)

1. **Navigate to session test page.**
2. **Add server via OAuth popup:**
   - Enter `https://kotel.localhost` in server URL input.
   - Click "Add server".
   - Popup opens with login page.
   - Fill login + password.
   - Submit → popup closes.
   - Server appears in sidebar and server list.
3. **Verify session:**
   - Click "Check status" → user info displayed.
4. **Second server:**
   - Add `https://katel.localhost` via OAuth.
   - Both servers visible.
   - Switch between servers.
5. **Invalid credentials:**
   - Add server → enter wrong password → error shown on login page.

### Session lifecycle test (`session-lifecycle.spec.ts`)

1. Login via OAuth.
2. **Verify access token in cookies** (httpOnly — can check via API call success).
3. **Trigger refresh**: wait for access token expiry or manually clear access token cookie and make a request.
4. **Verify new session**: status check still works after refresh.
5. **Logout single device**: click "Logout" → server removed, subsequent requests fail.
6. **Logout all devices**: login from test, logout all devices → verify second session also invalidated.

### Setup flow test (`setup-flow.spec.ts`)

1. **Navigate to setup page.**
2. **Check fresh server availability.**
3. **Create root user** (on `katel.localhost` if fresh).
4. **Verify setup lockout**: second init attempt → 403.
5. **Login as created root user** via OAuth.

### Test configuration

- Tests run against the two-server dev stack (Step 24).
- Use Playwright's popup handling: `page.waitForEvent('popup')`.
- Seed database before tests or use fresh database.

## Specification

1. Create `e2e/auth/` directory.
2. Write 3 test files with described scenarios.
3. Configure Playwright to handle popups and cross-origin.
4. Add test commands to package.json if needed.
5. Tests use the dev stack (not test containers — Playwright needs the browser-accessible frontend).

## Acceptance Criteria
1. All E2E tests pass.
2. OAuth popup flow works end-to-end.
3. Multi-server scenario tested.
4. Refresh/rotation verified (indirectly via continued access after expiry).
5. Logout verified.
6. Setup flow verified.
7. Tests use Playwright (not Vitest browser mode).

## Verification Scenario
```bash
npx playwright test apps/frontend/e2e/auth/
```
All tests green.
<CORRECTION by="step-executor" reason="playwright command path mismatch with frontend-local config">
Use frontend-local Playwright config and paths:
```bash
cd apps/frontend
npx playwright test --config e2e/playwright.config.ts e2e/auth/
```
</CORRECTION>

## Testing
This step IS the testing step.

## Notes
- Playwright can handle `window.open()` popups via `page.waitForEvent('popup')`.
- For the refresh test, consider setting a short `ACCESS_TOKEN_TTL_SECONDS=5` in test environment.
- Cross-origin popup: Playwright can interact with the popup page even on a different origin.
- The setup flow test needs a fresh database for `katel.localhost` — either reset between runs or use a test-specific setup.
