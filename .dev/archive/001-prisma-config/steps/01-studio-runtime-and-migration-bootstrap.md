# Step 01: Align Studio Runtime and Migration Bootstrap

## Goal
Ensure the `studio` service always applies all existing Prisma migrations before Prisma Studio starts, while preserving current local development workflow.

## Motivation
The user requires `studio` to be the single execution environment for Prisma operations and wants all already-created migrations applied automatically when `studio` starts.

## Type
infra, architectural

## Affected Area
`infra/compose/dev.yml`, `scripts/dev-start.sh` (only if startup messaging or assumptions must be updated)

## Dependencies
None

## Current Behavior
In `infra/compose/dev.yml`, service `studio` runs only:
- `npx prisma studio --browser none --port 5555`

This means migration application is not guaranteed during `studio` startup.

## Expected Behavior
When `studio` starts, it must first run `prisma migrate deploy`, and only then launch Prisma Studio.

## Specification
- Update `studio` command in `infra/compose/dev.yml` to a shell sequence equivalent to:
  - `npx prisma migrate deploy && npx prisma studio --browser none --port 5555`
- Keep current service boundaries:
  - `studio` still works in `/app/apps/prisma`
  - DB connection still comes from `DATABASE_URL` in compose environment
- Do not add host-side Prisma execution to this step; Prisma actions remain container-based.
- Do not introduce health-check gating changes here; only startup command behavior for `studio`.

## Acceptance Criteria
1. `studio` service command explicitly applies migrations before launching Prisma Studio.
2. `docker compose up studio` starts successfully when DB is reachable.
3. If no pending migrations exist, startup still succeeds and Prisma Studio becomes available.

## Verification Scenario
1. Run `docker compose --project-directory . -f infra/compose/dev.yml up -d studio`.
2. Check logs for migration deploy phase, then Prisma Studio startup message.
3. Open `http://localhost:5555` and confirm Prisma Studio is reachable.

## Testing
- Manual infra verification via `docker compose logs studio`.
- No unit tests required.

## Notes
- Keep command readable (single shell string is acceptable).
- This step is intentionally isolated from migration/seed scripts to keep rollback and debugging simple.
