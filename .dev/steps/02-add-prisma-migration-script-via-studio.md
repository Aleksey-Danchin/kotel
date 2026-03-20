# Step 02: Add Prisma Migration Script via Studio

## Goal
Add `scripts/prisma-migrate.sh` that creates a named migration through the `studio` container and manages container lifecycle exactly as requested.

## Motivation
Migration creation must be standardized and reproducible through Docker, not through arbitrary local Prisma CLI usage.

## Type
infra, feature

## Affected Area
`scripts/prisma-migrate.sh`, `infra/compose/dev.yml` (read-only dependency), executable permissions for `scripts/*.sh`

## Dependencies
Depends on step 01

## Current Behavior
- No migration script exists in `scripts/`.
- Users must run Prisma commands manually.
- No consistent handling of `studio` state, restart behavior, or file ownership after migration.

## Expected Behavior
Running:
- `./scripts/prisma-migrate.sh create_user_table`

must:
1. Validate exactly one argument (migration name).
2. Use `studio` container execution context.
3. Run `npx prisma migrate dev --name <arg>`.
4. Run `npx prisma generate` after migration.
5. Re-assign ownership for `/app/apps/prisma` to current host user uid:gid after success or failure.
6. If `studio` was already running before script start, restart it after migration.
7. If `studio` was not running, start it for action and stop it after completion.

## Specification
- Implement robust shell script with `set -euo pipefail`.
- Determine initial `studio` state before running commands.
- Use `docker compose --project-directory <root> -f infra/compose/dev.yml` consistently.
- Run Prisma commands through the container context (`docker compose exec` for running service; temporary run/compose up path for stopped service).
- Enforce single-argument contract:
  - No arg or multiple args => print usage and non-zero exit.
- Add `trap` to always execute ownership recovery:
  - inside container, run `chown -R <host_uid>:<host_gid> /app/apps/prisma`
  - must execute for both successful and failed migration runs.
- Encode exact lifecycle behavior from Q1 + Q16:
  - `studio` pre-running => mandatory restart after migration flow.
  - `studio` not running => bring up, run flow, then stop.
- Keep script location and API stable for future CI/local usage.

## Acceptance Criteria
1. `./scripts/prisma-migrate.sh` fails with clear usage when argument count is not exactly one.
2. Successful run creates migration with requested name and runs explicit `prisma generate`.
3. Ownership of `apps/prisma` is restored after both successful and failed runs.
4. Pre-running `studio` is restarted after script completion.
5. Non-running `studio` is started and then stopped by the script.

## Verification Scenario
1. Stop `studio`; run `./scripts/prisma-migrate.sh create_user_table`.
2. Confirm migration files appear in `apps/prisma/prisma/migrations`.
3. Confirm `apps/prisma/client` is generated/updated.
4. Check `docker compose ps` and confirm `studio` ended stopped.
5. Start `studio` manually, run script again with another name, and confirm `studio` restarts and remains running after completion.

<CORRECTION by="step-executor" reason="current schema has no pending changes">
In the current repository state, `npx prisma migrate dev --name <name>` completes with "Already in sync" and does not create a new migration directory unless schema changes are introduced first. Verification for this step therefore confirms command execution and post-actions (`prisma generate`, ownership recovery, lifecycle behavior), while migration file creation remains conditional on actual schema diffs.
</CORRECTION>

## Testing
- Manual script validation with both service-state branches (running/not running).
- Negative test: call with zero args and two args.

## Notes
- Preserve host-managed dependencies policy (no dedicated `node_modules` Docker volume changes).
- Script must remain Bash-compatible on Linux.
