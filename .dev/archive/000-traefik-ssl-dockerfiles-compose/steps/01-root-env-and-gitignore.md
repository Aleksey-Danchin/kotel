# Step 01: Root Environment File and Gitignore

## Goal
Create a project-root `.env` file with all base environment variables needed by Docker services, and a root `.gitignore` that excludes it (and other generated artifacts).

## Motivation
All Docker Compose services (postgres, backend, studio) require shared configuration values (database credentials, ports). A single `.env` at the project root is the canonical source; the compose manifest will interpolate these values and pass them to individual containers. The `.env` must never be committed.

## Type
infra

## Affected Area
- `/.env` (new)
- `/.gitignore` (new)

## Dependencies
None

## Current Behavior
No `.env` file exists in the repository root. No root-level `.gitignore` exists (only per-app `.gitignore` files inside `apps/backend/`, `apps/frontend/`, `apps/prisma/`).

## Expected Behavior
- `/.env` contains all variables required by docker compose services with sensible development defaults.
- `/.gitignore` prevents `.env` and other generated/runtime artifacts from being committed.

## Specification

### `.env`

Must contain at minimum:

| Variable            | Dev Default            | Used By                  |
|---------------------|------------------------|--------------------------|
| `POSTGRES_DB`       | `kotel`                | postgres, compose interp |
| `POSTGRES_USER`     | `kotel`                | postgres, compose interp |
| `POSTGRES_PASSWORD` | `kotel_dev`            | postgres, compose interp |
| `POSTGRES_PORT`     | `5432`                 | postgres, compose interp |

These variables are consumed in two ways:
1. **Directly by the `postgres` container** — it reads `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from its own environment to bootstrap the database.
2. **By compose variable interpolation** — the compose manifest assembles `DATABASE_URL` from these parts and injects it into backend and studio containers. The format is: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:${POSTGRES_PORT}/${POSTGRES_DB}` (where `postgres` is the Docker service name, hardcoded in compose).

### `.gitignore`

Must contain at minimum:
```
.env
node_modules/
dist/
```

Do NOT duplicate entries that already exist in per-app `.gitignore` files — the root `.gitignore` covers only root-level and cross-cutting patterns.

## Acceptance Criteria
1. `/.env` exists and contains `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` with non-empty default values.
2. `/.gitignore` exists and contains `.env` as an ignored pattern.
3. `/.gitignore` contains `node_modules/` and `dist/`.
4. No secrets or production credentials are present — only local development defaults.

## Verification Scenario
1. Run `cat .env` from the project root — verify all four variables are present.
2. Run `git status` — verify `.env` does NOT appear in untracked files (`.gitignore` works).

## Testing
Manual verification only. No automated tests required for this step.

## Notes
- The `POSTGRES_HOST` is intentionally omitted from `.env` — inside the Docker network, the host is always the service name (`postgres`) and is hardcoded in the compose manifest's `DATABASE_URL` interpolation.
- Do not add `.env.example` at this stage — the `.env` itself serves as the template for now.
