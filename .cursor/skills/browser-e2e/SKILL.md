---
name: ui-test-authoring
description: cursor-ide-browser for UI test authoring (Playwright E2E and @vitest/browser). Use when exploring page/component structure or debugging before writing or updating automated tests. NOT a substitute for automated tests.
---

> **This skill is for scenario development and debugging only.** cursor-ide-browser must NOT be used as a substitute for automated tests (Playwright E2E or @vitest/browser component tests). After exploring a scenario with cursor-ide-browser, write the corresponding automated test. Acceptance criteria must never be verified solely by cursor-ide-browser.

Comments: minimal. No self-commenting of actions. Log only errors with reproduction info (where: console, container name, browser page and actions). Reports off by default; when required, dry and to the point.

# UI Test Authoring (cursor-ide-browser)

Procedure for exploring and debugging frontend UI so you can author or update automated tests. Use `cursor-ide-browser` MCP to understand page/component structure, discover selectors, and debug failures — then capture the result as Playwright E2E or @vitest/browser tests. **Reconnaissance → automated test** for both E2E and component tests.

## Environment

**All UI E2E testing runs against the project's dev environment.**

- **Frontend URL**: `https://kris.localhost` — this is the only target for browser E2E; do not use other hosts or ports unless the plan explicitly says so.
- **Backend API**: `https://kris.localhost/api`
- **Browser tools**: `cursor-ide-browser` MCP server

**Login and test data:** Use credentials and test data from the project seed. The seed is applied via `docker exec kris-prisma-studio npx prisma db seed` (see `scripts/seed-users.sh` or Prisma seed script in the repo). If you need a test user (email/password) or pre-created entities (events, tourneys, etc.), get them from the seed implementation or project docs — do not assume or invent credentials.

## Quick Reference

| Action | Tool/Method |
|---|---|
| Open a page | `browser_navigate` to URL |
| See page structure | `browser_snapshot` — get element refs |
| Click element | `browser_click` with element ref |
| Type text (append) | `browser_type` with element ref |
| Type text (replace) | `browser_fill` with element ref |
| Wait for load | `browser_wait` (1–3s) + `browser_snapshot` check |
| Take screenshot | `browser_screenshot` for visual verification |
| Check console | `browser_console_messages` for JS errors |
| List tabs | `browser_tabs` with action "list" |

## E2E Test Authoring (Playwright)

Reconnaissance flow for full-page E2E: navigate in dev, explore, then write Playwright tests in `front/e2e/`.

### 1. Pre-check

Before any browser testing:
1. Verify frontend container is running: `docker compose -f infra/compose/docker-compose.dev.yml ps | grep frontend`
2. List existing browser tabs: `browser_tabs` action "list"
3. If a tab already exists → `browser_lock` before interactions

### 2. Navigate

```
browser_navigate → URL
browser_wait → 2s
browser_snapshot → verify page loaded
```

If page shows error or loading spinner after 2s:
- Wait 2s more → snapshot again
- Max 3 attempts (6s total)
- If still not loaded → report as failure

### 3. Authenticate (if scenario requires login)

Standard login flow:
1. Navigate to `https://kris.localhost` (redirects to login if not authenticated)
2. Fill email field
3. Fill password field
4. Click login button
5. Wait for redirect → snapshot → verify dashboard/home page

Use test user credentials from seed data. If credentials are unknown, report that authentication setup is needed.

### 4. Execute Scenario Steps

For each step in the E2E scenario from the phase file:

1. **Snapshot** before interaction — get current page state and element refs
2. **Interact** — click, fill, select as described
3. **Wait** — short incremental waits (1–3s) with snapshot checks
4. **Verify** — check expected outcome:
   - Element text matches expected value
   - Page navigated to expected URL
   - New elements appeared (list items, table rows, notifications)
   - No JS console errors (`browser_console_messages`)
5. **Screenshot** — capture state after each major interaction

### 5. Verification Checks

After each scenario, verify:

| Check | How |
|---|---|
| **Page renders** | Snapshot shows expected elements, no error boundaries |
| **No JS errors** | `browser_console_messages` — no uncaught exceptions |
| **API calls succeed** | No network error indicators in UI, data loads correctly |
| **Navigation works** | URL changes match expected routes |
| **User feedback** | Toast notifications, form validation messages appear correctly |
| **Data persistence** | After form submit → page refresh → data still present |

### 6. Cleanup

After all scenarios:
1. `browser_unlock` to release the browser tab
2. Close any extra tabs opened during testing

## Component Test Authoring (@vitest/browser)

Reconnaissance flow for component-level tests: see the component in context on a real page, then write or update `*.browser.test.tsx` with the same locator patterns.

- **Target**: Dev environment. Navigate to a page that renders the component (e.g. event page, tourney page). Use `browser_navigate` → `browser_snapshot` to get the live DOM.
- **Mapping to tests**: In @vitest/browser you use the same Playwright-style locators (`page.getByRole`, `page.getByText`, `page.getByTestId`, etc.). Note from the snapshot which roles, labels, or test IDs the component exposes; use those in the test. Prefer `getByRole` / `getByLabelText` over fragile class or DOM structure.
- **Isolation in test**: The actual test renders the component in isolation (e.g. `render(<MyComponent {...props} />)` with mocks). You are not navigating to a URL in the test — reconnaissance on the full page tells you what elements and states to assert; the test reproduces that with mocked data.
- **File layout**: `front/src/components/<area>/<ComponentName>/<ComponentName>.browser.test.tsx`. Config: `front/vitest.browser.config.ts`. Run: `docker exec kris-frontend-test npx vitest run --config vitest.browser.config.ts <path>`.

## Test Update / Debugging

When an existing UI test fails and the cause is unclear:

1. **Open the same UI in the browser** — For E2E: navigate to the route the test uses. For component: navigate to a page that renders that component.
2. **Snapshot** — `browser_snapshot` and note the current structure: visible text, roles, labels, order of elements.
3. **Compare with the test** — What selector or assertion does the test use? Is that element still present with the same role/text? Was it renamed, removed, or moved?
4. **Identify the mismatch** — e.g. changed button label, new wrapper div, different loading state markup.
5. **Update the test** — Adjust selectors or expectations to match the current UI. Re-run the automated test until it passes.

Use `browser_console_messages` if the failure might be a JS error; use screenshots to document the current state before changing the test.

## Reporting Format

```
### Browser E2E Results: Phase XX

#### Scenarios Tested
| # | Scenario | Steps | Result | Screenshots |
|---|---|---|---|---|

#### Failures (if any)
- **Scenario**: <name>
- **Step**: <which step failed>
- **Expected**: <what should have happened>
- **Actual**: <what actually happened>
- **Screenshot**: <reference>
- **Console errors**: <if any>

#### Console Errors
- <list of JS errors from browser_console_messages, if any>

#### Summary
X/Y scenarios passed. <brief assessment>
```

## Error Handling

| Situation | Action |
|---|---|
| Page doesn't load | Check frontend container logs, report |
| Element not found in snapshot | Wait + re-snapshot (max 3 attempts), then report |
| JS console errors | Include in report, may indicate real bugs |
| Network timeout | Check backend container health, report |
| Login fails | Check seed data, check auth endpoints, report |
| Unexpected redirect | Screenshot + report URL mismatch |

## Important Rules

- **Always snapshot before interacting** — never click/fill without knowing current page state
- **Use incremental waits** (1–3s) instead of long sleeps
- **Capture screenshots** at key moments — they are evidence for bug reports
- **Check console errors** after every page navigation
- **In the browser, only observe** — do not use the browser to change application code; test authoring (writing/editing test files) is done in the editor after reconnaissance
- **Report ALL failures** — do not silently skip failing scenarios
