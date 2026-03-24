# Step 14: First-run setup and .well-known/client

## Goal
Implement the first-run setup endpoints (create root user when no users exist) and the `.well-known/client` discovery endpoint.

## Motivation
The first-run setup solves the bootstrap problem: with no open registration, the first user must be created via a special one-time mechanism. The `.well-known/client` endpoint enables client discovery per AUTH_DESIGN.md.

## Type
feature, backend

## Affected Area
- `apps/backend/src/setup/` — new module (generate via `npx nest generate resource setup --no-spec`)
- `apps/backend/src/setup/setup.module.ts`
- `apps/backend/src/setup/setup.controller.ts`
- `apps/backend/src/setup/setup.service.ts`
- `apps/backend/src/main.ts` — global prefix exclusion for `.well-known`
- `apps/backend/src/app.module.ts` — register SetupModule

## Dependencies
Depends on Step 08 (@Public decorator for exempting setup routes from auth guard).

## Current Behavior
No setup mechanism. No `.well-known` endpoint.

## Expected Behavior

### `GET /api/setup/status` — Public

Returns:
```json
{ "available": true }   // when 0 users in DB
{ "available": false }  // when any user exists
```

### `POST /api/setup/init` — Public

Body validated with `setupInitSchema`: `{ login, password, fullname }`.

Behavior:
1. Count users in DB. If > 0 → 403 `{ message: "Setup already completed" }`.
2. Hash password with bcrypt (same rounds as admin user creation).
3. Create user with role `ROOT`.
4. Return user (without passwordHash).
5. User then goes through normal OAuth login to get tokens.

### `GET /.well-known/client`

**Outside** the `/api/` prefix. Returns:
```json
{ "recommended_client": "https://kotel.localhost" }
```

Value from `RECOMMENDED_CLIENT_URL` env variable. If not set → 404.

To exclude from the global `/api/` prefix, update `main.ts`:
```typescript
app.setGlobalPrefix('api', {
  exclude: [{ path: '.well-known/client', method: RequestMethod.GET }],
});
```

The `.well-known` route can be handled by the `SetupController` (with an explicit path override) or a dedicated controller.

### Environment variable

`RECOMMENDED_CLIENT_URL` — optional. Add to `infra/compose/dev.yml`: `RECOMMENDED_CLIENT_URL=https://kotel.localhost`.

## Specification

1. Generate: `npx nest generate resource setup --no-spec`.
2. Implement `GET /setup/status` and `POST /setup/init` with `@Public()`.
3. Implement `.well-known/client` route with global prefix exclusion.
4. Register `SetupModule` in `AppModule`.
5. Add env variable to compose.

## Acceptance Criteria
1. `GET /api/setup/status` → `{ available: true }` with empty DB.
2. `POST /api/setup/init` creates ROOT user, returns user data.
3. Second `POST /api/setup/init` → 403.
4. After init, `GET /api/setup/status` → `{ available: false }`.
5. `GET /.well-known/client` → `{ recommended_client: "..." }` when env set.
6. `GET /.well-known/client` → 404 when env not set.
7. Both setup endpoints accessible without auth token.

## Verification Scenario
1. Fresh DB: `GET /api/setup/status` → `{ available: true }`.
2. `POST /api/setup/init { login: "root", password: "pass", fullname: "Root" }` → user created.
3. `GET /api/setup/status` → `{ available: false }`.
4. `GET /.well-known/client` → recommended client URL.

## Testing
Integration tests in Step 26.

## Notes
- The setup endpoint is a one-time bootstrap. After the root user exists, it's permanently locked.
- `.well-known` follows RFC 8615 convention. No security implications.
- After setup, the user must login via OAuth — no automatic session creation.
