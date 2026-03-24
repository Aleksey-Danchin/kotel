---
name: test-runner
description: Run tests inside Docker containers for backend (Jest), frontend (Vitest), or strategies. Use when you need to execute tests, check test results, or verify that tests pass after implementation.
---

Comments: minimal. No self-commenting of actions. Log only errors with reproduction info (where: console, container name, browser page and actions). Reports off by default; when required, dry and to the point.

# Test Runner

Run project tests inside Docker containers. Tests **never** run on the host.

## Quick Reference

| Target | Container | Command |
|--------|-----------|---------|
| Backend (all) | `kris-backend-test` | `docker exec kris-backend-test npm test` |
| Backend (specific file) | `kris-backend-test` | `docker exec kris-backend-test npx jest <path> --no-coverage` |
| Backend (pattern) | `kris-backend-test` | `docker exec kris-backend-test npx jest --testPathPattern="<pattern>" --no-coverage` |
| Frontend (all) | `kris-frontend-test` | `docker exec kris-frontend-test npm test` |
| Frontend (specific file) | `kris-frontend-test` | `docker exec kris-frontend-test npx vitest run <path>` |
| Frontend (pattern) | `kris-frontend-test` | `docker exec kris-frontend-test npx vitest run --reporter=verbose <pattern>` |

## Workflow

### 1. Verify test container is running

```bash
docker compose -f infra/compose/docker-compose.dev.yml ps | grep test
```

If the test container is not running, inform the user — they need to start it.

### 2. Run the tests

Choose the appropriate command based on the target:

**Run specific phase tests** (during implementation):
```bash
docker exec kris-backend-test npx jest back/src/auth/auth.service.spec.ts --no-coverage
```

**Run all project tests** (final verification):
```bash
docker exec kris-backend-test npm test
docker exec kris-frontend-test npm test
```

### 3. Parse the output

Report results in this format:

```
### Test Results

- **Target**: backend / frontend / strategies
- **Scope**: specific file / pattern / all
- **Result**: X passed, Y failed, Z skipped
- **Duration**: Ns

#### Failures (if any)

- `test name` — error message
```

## Error Handling

| Situation | Action |
|-----------|--------|
| Container not running | Report to user, ask them to start it |
| Tests fail | Report failures with details, pass back to calling agent |
| Container command fails | Check container logs: `docker logs kris-backend-test --tail 50` |
| Timeout | Tests may be hanging — report and suggest investigation |

## Important Rules

- **NEVER** run tests on the host (`npm test`, `npx jest` directly)
- **NEVER** modify test files (that's test-writer's job)
- **NEVER** modify source code (that's worker's job)
- Only report results — let the calling agent decide what to do with them
