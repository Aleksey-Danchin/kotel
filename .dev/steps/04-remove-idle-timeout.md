# Step 04: Remove IDLE_TIMEOUT

## Goal

Remove `IDLE_TIMEOUT` from `.env`, `infra/compose/dev.yml`, `infra/compose/test.yml`, and `README.md` entirely. It was planned but never implemented, and its presence as a "required" variable is misleading.

## Motivation

`IDLE_TIMEOUT` is declared as a required env variable in README.md and is present in all compose files, but the backend source code does not read or use it anywhere. This creates confusion for developers and AI agents who expect it to have an effect.

## Type

refactor, infra

## Affected Area

- `.env` — remove `IDLE_TIMEOUT=3600`
- `infra/compose/dev.yml` — remove `IDLE_TIMEOUT` from all service `environment` sections
- `infra/compose/test.yml` — remove `IDLE_TIMEOUT` from service `environment` section
- `README.md` — remove all references to `IDLE_TIMEOUT` and `TEST_IDLE_TIMEOUT`

## Dependencies

None.

## Current Behavior

**`.env`** contains:
```
IDLE_TIMEOUT=3600
...
TEST_IDLE_TIMEOUT=3600
```

**`infra/compose/dev.yml`** contains (in the `backend` and `backend-2` service environment sections):
```yaml
- IDLE_TIMEOUT=${IDLE_TIMEOUT:-3600}
```

**`infra/compose/test.yml`** contains (in the backend service environment section):
```yaml
- IDLE_TIMEOUT=${TEST_IDLE_TIMEOUT:-3600}
```

**`README.md`** contains (in the "Shared Contracts and Session Envs" section):
```
- Required session env vars:
  - `SESSION_COOKIE_DOMAIN` - required for backend cookie domain.
  - `IDLE_TIMEOUT` - required positive integer in seconds.
- Test stack deterministic env inputs:
  - `TEST_SESSION_COOKIE_DOMAIN` (mapped to backend `SESSION_COOKIE_DOMAIN` in `infra/compose/test.yml`).
  - `TEST_IDLE_TIMEOUT` (mapped to backend `IDLE_TIMEOUT` in `infra/compose/test.yml`).
```

**`apps/backend/src/`** — `IDLE_TIMEOUT` is not read anywhere.

## Expected Behavior

- `.env` no longer has `IDLE_TIMEOUT` or `TEST_IDLE_TIMEOUT` lines.
- `infra/compose/dev.yml` no longer passes `IDLE_TIMEOUT` to any service.
- `infra/compose/test.yml` no longer passes `IDLE_TIMEOUT` to any service.
- `README.md` only lists `SESSION_COOKIE_DOMAIN` as the required session env var. `TEST_IDLE_TIMEOUT` reference is also removed.

## Specification

### `.env`

Remove the following lines:
```
IDLE_TIMEOUT=3600
```
and
```
TEST_IDLE_TIMEOUT=3600
```

### `infra/compose/dev.yml`

In the `environment:` section of the `backend` service, remove:
```yaml
- IDLE_TIMEOUT=${IDLE_TIMEOUT:-3600}
```

In the `environment:` section of the `backend-2` service (if present), remove the same line.

### `infra/compose/test.yml`

In the `environment:` section of the backend service, remove:
```yaml
- IDLE_TIMEOUT=${TEST_IDLE_TIMEOUT:-3600}
```

### `README.md`

In the "Shared Contracts and Session Envs" section, update:

**Before:**
```markdown
- Required session env vars:
  - `SESSION_COOKIE_DOMAIN` - required for backend cookie domain.
  - `IDLE_TIMEOUT` - required positive integer in seconds.
- Test stack deterministic env inputs:
  - `TEST_SESSION_COOKIE_DOMAIN` (mapped to backend `SESSION_COOKIE_DOMAIN` in `infra/compose/test.yml`).
  - `TEST_IDLE_TIMEOUT` (mapped to backend `IDLE_TIMEOUT` in `infra/compose/test.yml`).
```

**After:**
```markdown
- Required session env vars:
  - `SESSION_COOKIE_DOMAIN` - required for backend cookie domain.
- Test stack deterministic env inputs:
  - `TEST_SESSION_COOKIE_DOMAIN` (mapped to backend `SESSION_COOKIE_DOMAIN` in `infra/compose/test.yml`).
```

Also remove `IDLE_TIMEOUT` from the `testing.mdc` Cursor rule if it appears there (check `.cursor/rules/testing.mdc`).

## Acceptance Criteria

1. `IDLE_TIMEOUT` does not appear in `.env`.
2. `TEST_IDLE_TIMEOUT` does not appear in `.env`.
3. `IDLE_TIMEOUT` does not appear in any `environment:` block in `infra/compose/dev.yml`.
4. `IDLE_TIMEOUT` does not appear in any `environment:` block in `infra/compose/test.yml`.
5. `README.md` "Shared Contracts and Session Envs" section no longer mentions `IDLE_TIMEOUT` or `TEST_IDLE_TIMEOUT`.
6. The backend still starts correctly (no crash due to missing env var).

## Verification Scenario

1. Search entire repository for `IDLE_TIMEOUT` — should return zero results outside of `.dev/` and `docs/` directories.
2. Start dev stack (`scripts/dev-start.sh`) — backend starts without errors.
3. Run backend unit tests — all pass (no test reads `IDLE_TIMEOUT`).

## Testing

Manual verification + existing test suite must continue to pass.

## Notes

- Do a full-text search for `IDLE_TIMEOUT` across the repo to catch any other occurrences that are not listed above (e.g. in other docs or config files).
- The `.cursor/rules/testing.mdc` mentions `IDLE_TIMEOUT` in the "Session Environment Conventions" section — that should also be cleaned up.
