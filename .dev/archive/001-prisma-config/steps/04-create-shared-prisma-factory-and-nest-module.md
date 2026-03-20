# Step 04: Create Shared Prisma Factory and Nest Module

## Goal
Create a shared Prisma client factory in `apps/prisma` using modern adapter-pg, then expose it in backend through a `PrismaModule` and `PrismaService` wrapper.

## Motivation
Prisma instance creation must be centralized outside backend for reuse by multiple executors in the future, while backend consumes it via NestJS DI.

## Type
backend, architectural, data-model

## Affected Area
`apps/prisma/*` (factory files and dependencies), `apps/backend/src/prisma/*`, `apps/backend/src/app.module.ts`, `apps/backend/package.json`, `apps/backend/tsconfig.json` (if path import adjustment is needed)

## Dependencies
Depends on step 03

## Current Behavior
- Backend has only `AppModule`, `AppController`, `AppService`; no Prisma module or service.
- `apps/prisma` has schema/config but no runtime client factory.
- No configured base omit for `login` and `passwordHash`.

## Expected Behavior
- `apps/prisma` exposes a factory that returns Prisma instance configured with:
  - PostgreSQL adapter (`@prisma/adapter-pg`)
  - global base omit for `User.login` and `User.passwordHash`
- Backend defines `PrismaModule` exporting `PrismaService` (wrapper/alias over shared instance).
- Backend installs `bcryptjs` dependency as requested.

## Specification
- In `apps/prisma`, add required dependencies for runtime Prisma client with adapter-pg (`@prisma/adapter-pg`, `pg`, and any required Prisma runtime package for generated client usage).
- Implement shared factory API (single responsibility: create/get configured Prisma instance).
- Encode base omit in the Prisma instance construction, not in per-query select clauses.
- In backend:
  - create `src/prisma/prisma.module.ts`
  - create `src/prisma/prisma.service.ts`
  - import `PrismaModule` into `AppModule`
  - export `PrismaService` from module for downstream feature modules
- Install `bcryptjs` in backend dependencies (`apps/backend/package.json`) per requirement.
- Keep DI contract aligned with Q8: class-based `PrismaService` export.

## Acceptance Criteria
1. Shared Prisma factory exists in `apps/prisma` and is imported by backend.
2. Prisma instance is configured with adapter-pg.
3. Base omit hides `login` and `passwordHash` globally on `User`.
4. Backend `PrismaModule` exports `PrismaService` and is wired in `AppModule`.
5. `bcryptjs` is present in backend dependencies.

## Verification Scenario
1. Build backend (`npm run build` in `apps/backend`) and confirm compile passes.
2. Start backend and confirm app boots with Prisma module initialized.
3. Log or inspect returned user objects from Prisma calls and verify omitted fields are absent by default.

## Testing
- Backend unit/integration smoke test for module bootstrapping.
- Manual runtime check using temporary users query in service layer.

## Notes
- Prefer existing backend path alias `~prisma/*` when importing from `apps/prisma`, or update backend tsconfig only if necessary.
