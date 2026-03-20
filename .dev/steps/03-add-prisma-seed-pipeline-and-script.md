# Step 03: Add Prisma Seed Pipeline and Script

## Goal
Introduce a manual seed pipeline for Prisma with a dedicated `scripts/prisma-seed.sh` script that resets DB state, regenerates client, and seeds 100 users.

## Motivation
The project needs deterministic test data and explicit operator control. Seeding must not happen automatically and must run only on demand through the `studio` container context.

## Type
data-model, feature, infra

## Affected Area
`apps/prisma/package.json`, `apps/prisma/prisma/seed/*` (or equivalent seed directory), `apps/prisma/prisma/schema.prisma` (if seed declaration requires it), `scripts/prisma-seed.sh`, `apps/prisma/prisma/User.prisma`

## Dependencies
Depends on steps 01, 02

## Current Behavior
- No seed directive is configured.
- No manual seed script exists in `scripts/`.
- No seeded users dataset exists.

## Expected Behavior
- A reusable seed entrypoint exists in Prisma package for future multiple seed files.
- `scripts/prisma-seed.sh` performs:
  1. `prisma migrate reset --force --skip-generate`
  2. explicit `prisma generate`
  3. seed execution
- Seed creates exactly 100 users:
  - `fullname: "User <n>"`
  - `login: "user<n>"`
  - `passwordHash`: bcrypt hash of `123` (single shared hash is allowed)
- Script runs only manually and does not auto-run in app startup.

## Specification
- Configure Prisma seed command in `apps/prisma/package.json` (`prisma.seed`) and add runtime dependencies required by seed implementation.
- Add seed implementation structure that is extensible for future entities (a clear directory/module convention, not a one-off inline script).
- Implement users seed logic (upsert/create strategy must avoid unique login conflicts across reruns after reset).
- Implement `scripts/prisma-seed.sh` in style compatible with migration script:
  - uses `studio` container execution context
  - handles running/not-running `studio` similarly
  - applies ownership fix for `/app/apps/prisma` after run (success/failure)
- Ensure no automatic seed trigger is wired into `dev-start.sh`, compose command, or backend bootstrap.

## Acceptance Criteria
1. `scripts/prisma-seed.sh` exists and is executable.
2. Script resets DB with `migrate reset --force --skip-generate`, then runs explicit `prisma generate`, then seed.
3. Seed result is 100 users matching naming format `User 1..100` and `user1..user100`.
4. All seeded users store bcrypt hash of `123` in `passwordHash`.
5. Seed remains manual-only (no automatic invocation from startup flows).

## Verification Scenario
1. Run `./scripts/prisma-seed.sh`.
2. Open Prisma Studio and inspect `User` table.
3. Confirm exactly 100 users exist with expected names/logins.
4. Confirm no plain-text `123` is stored in `passwordHash`.
5. Re-run script and verify deterministic clean state (still exactly 100 users).

## Testing
- Manual DB validation through Prisma Studio.
- Optional lightweight script check for count via Prisma query command.

## Notes
- Keep seed architecture ready for additional future seed domains, not only users.
