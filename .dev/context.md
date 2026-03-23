## Step 03: Remove old session code and enable CORS
- `docker compose -f infra/compose/dev.yml ...` requires `PROJECT_ROOT` exported (or `--project-directory` set), otherwise compose fails on variable interpolation.
- After removing legacy session/backend code, restarting `kotel-backend-1` can be required to recover dev health from transitional runtime failures.

## Step 04: Token utilities, cookie constants, and contracts
- In `infra/compose/test.yml`, Prisma Studio service key is `studio-test` (container `kris-prisma-studio-test`), not `prisma-studio-test`.

## Step 05: Auth module — code store, login page, POST /auth/login
- In backend dev container (`nest start --watch` with webpack bundle), `__dirname` resolves to `/apps/backend/dist`, so static files from `src/` should be read via `process.cwd()` paths unless copied to `dist`.

## Step 08: Access token guard and @Public decorator
- Dev backend healthcheck probes `GET /api` and expects 200; when introducing a global auth guard, keep this route public (e.g., `@Public()` on `AppController.getHello`) so container health remains stable.
