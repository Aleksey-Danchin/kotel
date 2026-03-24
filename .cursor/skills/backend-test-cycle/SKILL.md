---
name: backend-test-cycle
description: Runs full backend test cycle in isolated Docker test containers: cleanup old test containers, start backend/postgres/prisma-studio test stack, run migrations, seed data, execute backend tests, and handle cleanup/retry decisions. Use when user asks to run backend tests with fresh test database or mentions backend-test/postgres-test/prisma-studio-test flow.
---

Comments: minimal. No self-commenting of actions. Log only errors with reproduction info (where: console, container name, browser page and actions). Reports off by default; when required, dry and to the point.

# Backend Test Cycle

Полный цикл backend-тестирования в изолированном test-окружении.

## Scope

Use this skill for backend test runs that require a clean DB:
- `kris-backend-test`
- `kris-postgres-test` (without volume)
- `kris-prisma-studio-test`

Do not run backend tests on host.

## Preflight

1. Read `infra/compose/docker-compose.dev.yml`.
2. Confirm test service/container naming used in current repo for backend/postgres/prisma-studio with `-test` suffix.
3. If names differ from defaults above, follow compose-defined names and report which names are used.

## Standard Workflow

1. **Ensure no stale test containers are running**
   - Check test containers.
   - If any are running, stop/kill them before a new run.

2. **Start only backend test stack**
   - Start only test analogs of backend, postgres, prisma-studio.
   - Do not start unrelated services.

3. **Run DB migrations for test Postgres**
   - Run migrations through `prisma-studio-test` container (same Prisma workflow as regular environment, but against test DB).
   - Migration step must be explicitly validated as successful before moving on.

4. **Run seed for test data**
   - Run seed through `prisma-studio-test` container.
   - Confirm successful completion.

5. **Run backend tests**
   - Execute tests in `backend-test` container.
   - Parse pass/fail result and key failures.

6. **Post-run container handling**
   - If all tests pass: test containers may be stopped/killed and report success.
   - If this was only a one-off test run and tests failed: stop/kill test containers after reporting failures.
   - If this is an active fix cycle (non-empty run): report failures, wait for fixes, then run tests again. Repeat until pass or clear blocking condition.

## Command Pattern (adapt to actual service names)

Use compose file `infra/compose/docker-compose.dev.yml`.

```bash
# 1) Check existing test containers
docker ps --format '{{.Names}}' | rg 'kris-(backend|postgres|prisma-studio)-test'

# 2) Kill stale test containers (if found)
docker rm -f kris-backend-test kris-postgres-test kris-prisma-studio-test

# 3) Start only test services
docker compose -f infra/compose/docker-compose.dev.yml up -d backend-test postgres-test prisma-studio-test

# 4) Migrations (test DB)
docker exec kris-prisma-studio-test npx prisma migrate deploy

# 5) Seed (test DB)
docker exec kris-prisma-studio-test npx prisma db seed

# 6) Backend tests
docker exec kris-backend-test npm test
```

If this repository uses different commands for migrations/seeds in test mode, follow repository conventions from rules/scripts and keep execution inside containers.

## Special Cases (Mandatory)

1. **Containers were killed externally**
   - If containers disappear during workflow (external stop/kill), report this fact.
   - Do not auto-recreate and continue silently in the same run.

2. **All tests passed**
   - You may stop/kill test containers.
   - Report that test cycle finished successfully.

3. **Tests failed**
   - If this is only a test run request: report failures and stop/kill containers.
   - If this is a fix cycle: report failures, wait for code fixes, rerun tests.
   - Continue until success or until it is clear the code cannot be reasonably fixed within current constraints; then report blocker clearly.

## Reporting Template

Use this structure in responses:

```markdown
### Backend Test Cycle
- Stack: <which test containers were used>
- Migration: success/fail
- Seed: success/fail
- Tests: <X passed, Y failed>
- Cleanup: <stopped/killed/kept-running>
- Notes: <external kill, retry loop status, blockers>
```

