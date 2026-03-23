# Step 15: Update seed data with roles

## Goal
Update the Prisma seed script to assign roles: user1 as ROOT, user2–4 as ADMIN, the rest as USER.

## Motivation
Dev and test environments need pre-populated users with appropriate roles for testing role-based access, admin endpoints, and OAuth flow.

## Type
data-model

## Affected Area
- `apps/prisma/seed/users.seed.ts`

## Dependencies
Depends on Step 02 (User model has `role` field).

## Current Behavior
Creates 100 users (`user1`–`user100`) with password `123`, no `role` field set (defaults to USER).

## Expected Behavior

Updated seed:
- `user1` → `ROOT`, fullname `Root User`
- `user2`–`user4` → `ADMIN`, fullname `Admin User N`
- `user5`–`user100` → `USER`, fullname `User N`
- All passwords remain `123`.

## Specification

1. Update `apps/prisma/seed/users.seed.ts` to include role assignment logic.
2. Use enum values matching Prisma schema: `ROOT`, `ADMIN`, `USER`.

## Acceptance Criteria
1. After seeding: `user1` has role ROOT.
2. `user2`–`user4` have role ADMIN.
3. `user5`–`user100` have role USER.
4. Seed runs without errors.

## Verification Scenario
1. Run seed script.
2. `SELECT login, role FROM "User" ORDER BY login LIMIT 10` → correct roles.

## Testing
Manual verification.

## Notes
- Small change (~15 lines modified). The `createMany` call just gets a `role` field added to each data object.
