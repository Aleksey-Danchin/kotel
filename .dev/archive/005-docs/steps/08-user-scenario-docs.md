# Step 08: Create user scenario docs and add cross-reference comments to E2E tests

## Goal

Create `docs/scenarios/` with three user scenario files (one per existing Playwright E2E test), then add a `// → docs/scenarios/...` comment above each relevant `test()` block in the E2E spec files pointing to the corresponding scenario doc.

## Motivation

Tests verify that the software works, but they do not explain what user story they validate. Scenario docs describe user-facing behavior in plain language (steps from the user's perspective). Cross-reference comments in tests create a traceable link: given a scenario doc, a developer can find the tests; given a failing test, a developer can find the user story it validates.

Only scenarios that already have automated E2E coverage are documented — no speculative or manual-only scenarios.

## Type

docs

## Affected Area

- `docs/scenarios/web-auth/001-add-server-oauth.md` — new file
- `docs/scenarios/web-session/001-session-lifecycle.md` — new file
- `docs/scenarios/web-setup/001-setup-init.md` — new file
- `apps/frontend/e2e/auth/oauth-flow.spec.ts` — add comment(s)
- `apps/frontend/e2e/auth/session-lifecycle.spec.ts` — add comment(s)
- `apps/frontend/e2e/auth/setup-flow.spec.ts` — add comment(s)

## Dependencies

- Step 01 (auth docs split) — scenario docs reference `docs/auth/*.md` files.

## Current Behavior

Three Playwright E2E test files exist in `apps/frontend/e2e/auth/`:

**`oauth-flow.spec.ts`** — one test: `"OAuth popup flow supports multi-server and invalid credentials"`. Tests: add primary server via OAuth popup, add secondary server, both cards visible, invalid credentials show error.

**`session-lifecycle.spec.ts`** — one test: `"session lifecycle: refresh, logout, and logout all devices"`. Tests: add server, force refresh, add second context (second device), logout all devices invalidates second context, re-login, single logout.

**`setup-flow.spec.ts`** — one test: `"setup page supports init lockout and OAuth login"`. Tests: visit `/setup`, fill form or skip if already configured, verify lockout (second init attempt returns 403), login normally.

None of these tests have any comments referencing a scenario document.

## Expected Behavior

- Three scenario files exist under `docs/scenarios/`.
- Each E2E test has a comment immediately before the `test(...)` call referencing the scenario doc.

## Specification

### Scenario file format

Each scenario file follows this structure:

```markdown
# Scenario NNN: <Title>

**Client:** web  
**Automated test:** `<relative path to E2E spec>`

## Goal

One sentence describing what user goal this scenario validates.

## Preconditions

- What must be true before the scenario starts.

## Steps

1. Step one — action (user does X).
2. Step two — expected result (user sees Y).
3. ...

## Notes

Any edge cases, alternative paths, or relevant references.
```

---

### `docs/scenarios/web-auth/001-add-server-oauth.md`

```markdown
# Scenario 001: Add a server via OAuth popup

**Client:** web  
**Automated test:** `apps/frontend/e2e/auth/oauth-flow.spec.ts`

## Goal

A user adds one or more backend servers to their session via the OAuth 2.0 popup flow and verifies the session card appears.

## Preconditions

- At least one backend server is running and reachable.
- The server has at least one user account (root user created via setup).

## Steps

1. Open the session-test page (`/session-test`).
2. Enter the server URL in the "Add server" input field.
3. Click "Add server" — a popup window opens with the server login page.
4. Enter valid login and password in the popup, click Submit.
5. The popup closes automatically.
6. A server card appears in the session list showing the server URL.
7. Click "Check status" on the card — a `sessionId` field appears.

**Multi-server variant (steps 8–10):**

8. Repeat steps 2–6 for a second server URL.
9. Both server cards are visible simultaneously.
10. Clicking each server in the sidebar shows the correct server card.

**Invalid credentials variant:**

11. Enter the server URL again and open the popup.
12. Enter a wrong password.
13. The server login page shows an error alert ("Invalid credentials").
14. The popup is not closed automatically — the user can retry.

## Notes

- The popup uses PKCE + state. The `state` is stored in `sessionStorage` during the flow.
- Related architecture: `docs/auth/oauth-flow.md`
```

---

### `docs/scenarios/web-session/001-session-lifecycle.md`

```markdown
# Scenario 001: Session lifecycle — refresh, logout, logout all devices

**Client:** web  
**Automated test:** `apps/frontend/e2e/auth/session-lifecycle.spec.ts`

## Goal

A user can force-refresh their session token, log out from a single device, and log out from all devices simultaneously, with the latter invalidating sessions on other open contexts.

## Preconditions

- User is logged in on the primary server (server card visible).

## Steps

**Token refresh:**

1. On the session-test page, with a server card visible, click "Force refresh".
2. Then click "Check status" on the card.
3. The `sessionId` field is still visible — the session survived the refresh.

**Logout all devices:**

4. Open the application in a second browser context (simulates a second device) and log in to the same server.
5. Verify the second context also has an active session (`GET /api/session/status` returns 200).
6. In the first context, click "Logout all devices" on the server card.
7. The server card disappears from the first context.
8. In the second context, `GET /api/session/status` returns 401 — the session is invalidated.

**Single device logout:**

9. Re-login in the first context via OAuth.
10. Click "Logout" (single device) on the server card.
11. The server card disappears.
12. `GET /api/session/status` in the first context returns 401.

## Notes

- "Force refresh" calls `POST /api/session/refresh` directly, rotating the refresh token.
- "Logout all devices" revokes all sessions for the user on that server.
- Related architecture: `docs/auth/sessions.md`
```

---

### `docs/scenarios/web-setup/001-setup-init.md`

```markdown
# Scenario 001: First-run server setup — create root user

**Client:** web  
**Automated test:** `apps/frontend/e2e/auth/setup-flow.spec.ts`

## Goal

An administrator sets up a fresh server by creating the root user via the setup page, verifies the setup is locked after first use, then logs in normally.

## Preconditions

- A backend server is running.
- The server may or may not have already been initialized (the scenario handles both cases).

## Steps

**Setup page navigation:**

1. Open `/setup`.
2. The heading "Первичная настройка сервера" is visible.
3. Enter the server URL and click "Check availability".

**If server is not yet initialized:**

4. A form "Создать root пользователя" appears.
5. Fill in login, password, and full name.
6. Click "Инициализировать".
7. A success message "Root user создан. Теперь можно добавить сервер." appears.

**If server is already initialized:**

4. A message "Сервер уже настроен. Перейдите к обычному логину." appears.

**Lockout verification:**

8. Attempt `POST /api/setup/init` again with different credentials.
9. The server returns `403 Forbidden` — setup is permanently locked after first use.

**Normal login after setup:**

10. Navigate to `/session-test`.
11. Add the server via OAuth popup (scenario 001 in web-auth).
12. The server card appears confirming the root user can log in.

## Notes

- Setup init is a one-time operation: after the root user is created, `GET /api/setup/status` returns `{ available: false }`.
- Related architecture: `docs/auth/implementation-decisions.md` (decision 11 — first-run setup).
```

---

### Cross-reference comments in E2E test files

Add a comment immediately before each `test(...)` call (not inside it):

**`apps/frontend/e2e/auth/oauth-flow.spec.ts`**, before `test("OAuth popup flow supports multi-server and invalid credentials", ...)`:
```ts
// → docs/scenarios/web-auth/001-add-server-oauth.md
test("OAuth popup flow supports multi-server and invalid credentials", async ({
```

**`apps/frontend/e2e/auth/session-lifecycle.spec.ts`**, before `test("session lifecycle: refresh, logout, and logout all devices", ...)`:
```ts
// → docs/scenarios/web-session/001-session-lifecycle.md
test("session lifecycle: refresh, logout, and logout all devices", async ({
```

**`apps/frontend/e2e/auth/setup-flow.spec.ts`**, before `test("setup page supports init lockout and OAuth login", ...)`:
```ts
// → docs/scenarios/web-setup/001-setup-init.md
test("setup page supports init lockout and OAuth login", async ({ page }) => {
```

## Acceptance Criteria

1. `docs/scenarios/web-auth/001-add-server-oauth.md` exists and contains all sections.
2. `docs/scenarios/web-session/001-session-lifecycle.md` exists and contains all sections.
3. `docs/scenarios/web-setup/001-setup-init.md` exists and contains all sections.
4. Each E2E spec file has a `// → docs/scenarios/...` comment immediately before the `test(...)` call.
5. The paths in comments are correct relative to the repo root.
6. No other changes to the E2E test logic — only the comment is added.

## Verification Scenario

1. Open `apps/frontend/e2e/auth/oauth-flow.spec.ts` — find the comment above `test(...)`.
2. Follow the path in the comment — open `docs/scenarios/web-auth/001-add-server-oauth.md`.
3. Verify steps in the scenario doc match what the test actually does.

## Testing

Manual only — documentation and comments. No automated tests required.

## Notes

- Keep scenario docs in plain Russian (consistent with project language).
- Steps should describe user actions and expected outcomes, not implementation details ("click Submit" not "call POST /api/auth/token").
- The `**Automated test:**` frontmatter field makes the link machine-discoverable in the future.
