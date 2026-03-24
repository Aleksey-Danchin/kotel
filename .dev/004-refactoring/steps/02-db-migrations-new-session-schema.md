# Step 02: DB migrations — drop old Session, new schema, User roles

## Goal
Replace the existing `Session` Prisma model with the new AUTH_DESIGN schema and add a `role` enum to the `User` model, via two sequential Prisma migrations.

## Motivation
The current `Session` model (`key`, `userId`, `lastUsedAt`) is incompatible with the dual-token OAuth 2.0 architecture. The new schema supports access/refresh token hashes, rotation chains, reuse detection, and session lifecycle tracking.

## Type
data-model, infra

## Affected Area
- `apps/prisma/schema/Session.prisma`
- `apps/prisma/schema/User.prisma`
- `apps/prisma/migrations/` — two new migration directories

## Dependencies
None

## Current Behavior

**Session** (`apps/prisma/schema/Session.prisma`):
```prisma
model Session {
    key        String   @id @default(cuid())
    userId     String
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    createdAt  DateTime @default(now())
    lastUsedAt DateTime @default(now())
    updatedAt  DateTime @updatedAt
}
```

**User** (`apps/prisma/schema/User.prisma`) — no `role` field.

## Expected Behavior

### Migration 1: Drop old Session table
Remove the Session model entirely. Run `npx prisma migrate dev --name drop_old_session`.

### Migration 2: New Session + User roles

**New Session model**:
```prisma
model Session {
    id                    String          @id @default(cuid())
    accessTokenHash       String          @unique
    refreshTokenHash      String          @unique
    sessionId             String
    userId                String
    user                  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
    clientType            ClientType
    status                SessionStatus   @default(ACTIVE)
    fingerprint           String
    prevSessionId         String?         @unique
    prevSession           Session?        @relation("SessionChain", fields: [prevSessionId], references: [id])
    nextSession           Session?        @relation("SessionChain")
    accessTokenExpiresAt  DateTime
    refreshTokenExpiresAt DateTime
    refreshUsedAt         DateTime?
    noActiveAt            DateTime?
    noActiveReason        NoActiveReason?
    noActiveDescribe      String?
    createdAt             DateTime        @default(now())
}

enum ClientType {
    WEB
    EXPO
}

enum SessionStatus {
    ACTIVE
    USED
    EXPIRED
    REVOKED
}

enum NoActiveReason {
    LOGOUT_CURRENT
    LOGOUT_ALL
    REUSE_DETECTED
    MANUAL_REVOKE
    LOCKDOWN
    EXPIRED
}
```

**Updated User** — add `role`:
```prisma
enum UserRole {
    USER
    ADMIN
    ROOT
}

model User {
    id           String    @id @default(cuid())
    fullname     String
    login        String    @unique
    passwordHash String
    role         UserRole  @default(USER)
    createdAt    DateTime  @default(now())
    updatedAt    DateTime  @updatedAt
    sessions     Session[]
}
```

Note: `fingerprint` is included in the Session model from the start (stores the origin portion of `redirect_uri`).

## Specification

1. Remove all fields from `Session.prisma` (or delete the file).
2. Run migration: `npx prisma migrate dev --name drop_old_session`.
3. Write the new Session model with all fields, enums, and relations.
4. Add `role UserRole @default(USER)` to User model, add `UserRole` enum.
5. Run migration: `npx prisma migrate dev --name create_oauth_session_and_user_roles`.
6. Regenerate Prisma client.

Use project's Prisma tooling — do NOT write migration SQL manually. Migrations must run inside the dev Docker container where the database is accessible.

## Acceptance Criteria
1. Two new migration directories in `apps/prisma/migrations/`.
2. New `Session` table has all specified fields with correct types and constraints.
3. `User` table has a `role` column with default `USER`.
4. Unique indexes on `accessTokenHash`, `refreshTokenHash`, `prevSessionId`.
5. `npx prisma validate` passes.
6. Prisma client regenerated and compiles.

## Verification Scenario
1. Run migrations.
2. Connect to PostgreSQL: `\d "Session"` shows new schema.
3. `\d "User"` shows `role` column.

## Testing
Manual verification via Prisma Studio or psql.

## Notes
- `sessionId` is a plain string grouper, NOT a foreign key.
- `prevSessionId` `@unique` prevents chain branching at DB level.
- `fingerprint` is included here to avoid a separate migration later.
