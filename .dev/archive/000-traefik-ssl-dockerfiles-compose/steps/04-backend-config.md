# Step 04: Backend Global API Prefix and Prisma Path Alias

## Goal
Configure the NestJS backend with a global `/api` route prefix and add a TypeScript path alias `~prisma/*` that resolves to the prisma subproject directory.

## Motivation
Traefik routes `kotel.localhost/api/*` to the backend **without stripping the prefix**. NestJS must therefore handle routes under `/api` — this requires `app.setGlobalPrefix('api')`. The Prisma path alias provides a clean import mechanism for backend code to access Prisma-generated client and schema types from the separate `apps/prisma/` subproject.

## Type
backend, architectural

## Affected Area
- `apps/backend/src/main.ts` (modify)
- `apps/backend/tsconfig.json` (modify)

## Dependencies
None

## Current Behavior

**`apps/backend/src/main.ts`:**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```
No global prefix is set. The default `AppController` responds on `GET /`.

**`apps/backend/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    // ... other options ...
  }
}
```
No `paths` mapping exists. There is no way to import from the prisma subproject without fragile relative paths.

## Expected Behavior

**`main.ts`:** The app is created with `app.setGlobalPrefix('api')`. The default `AppController` now responds on `GET /api` instead of `GET /`. All future routes will be under `/api/*`.

**`tsconfig.json`:** A `paths` entry maps `~prisma/*` to `../prisma/*` (relative to `baseUrl: "./"`), allowing imports like:
```typescript
import { PrismaClient } from '~prisma/generated/prisma';
```

## Specification

### `main.ts` Change
Add `app.setGlobalPrefix('api')` between `NestFactory.create()` and `app.listen()`.

### `tsconfig.json` Change
Add a `paths` object inside `compilerOptions`:
```json
"paths": {
  "~prisma/*": ["../prisma/*"]
}
```

Path resolution:
- `baseUrl` is `./` = `apps/backend/`
- `../prisma/*` resolves to `apps/prisma/*` from the repo root
- Example: `~prisma/generated/prisma` → `apps/prisma/generated/prisma`

### Why `~prisma` prefix?
The tilde prefix is a convention to distinguish project-internal aliases from npm packages. It avoids naming collisions with any real `prisma` package on npm.

## Acceptance Criteria
1. `apps/backend/src/main.ts` calls `app.setGlobalPrefix('api')` before `app.listen()`.
2. `apps/backend/tsconfig.json` has `paths` with `"~prisma/*": ["../prisma/*"]`.
3. `baseUrl` remains `"./"` (unchanged).
4. No other files are modified.
5. TypeScript compilation (`npx tsc --noEmit` in `apps/backend/`) produces no new errors related to these changes.

## Verification Scenario
1. Open `apps/backend/src/main.ts` — confirm `setGlobalPrefix('api')` is present.
2. Open `apps/backend/tsconfig.json` — confirm `paths` entry exists.
3. Run `cd apps/backend && npx tsc --noEmit` — confirm no compilation errors.

## Testing
No automated tests required. TypeScript type-check is sufficient verification.

## Notes
- The `app.controller.ts` default route uses `@Get()` which maps to the root. With the global prefix, this becomes `GET /api`. This endpoint will be used as the health check target in the compose manifest.
- The `tsconfig.build.json` extends `tsconfig.json`, so it inherits the `paths` mapping automatically.
- At runtime in the Docker container, the alias `~prisma/*` resolves correctly because the entire repo is bind-mounted to `/app`, preserving the relative directory structure.
