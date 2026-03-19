# Step 02: Dev-Mode Dockerfiles

## Goal
Create minimal Dockerfiles for the three Node.js services: backend, frontend, and prisma studio. These are dev-mode images — no code is copied, no dependencies are installed; everything comes from bind-mounted host volumes at runtime.

## Motivation
Docker Compose needs a build context and Dockerfile to create service images. In development, the Dockerfiles are intentionally thin — they only set the base image and working directory. The actual source code and `node_modules` are bind-mounted from the host, so the container's file tree mirrors the host's repo structure exactly (required for TypeScript path aliases and editor tooling to work correctly).

## Type
infra

## Affected Area
- `infra/docker/backend.Dockerfile` (new)
- `infra/docker/frontend.Dockerfile` (new)
- `infra/docker/studio.Dockerfile` (new)

## Dependencies
None

## Current Behavior
The `infra/` directory does not exist. There are no Dockerfiles anywhere in the repository.

## Expected Behavior
Three Dockerfiles exist at the specified paths. Each uses `node:24` (full Debian-based image, NOT alpine) and sets `WORKDIR` to match the app's location within the bind-mounted repo tree at `/app`.

## Specification

### Naming Convention
Files follow the pattern `infra/docker/<service>.Dockerfile`. The Docker Compose build context will be the repository root, so all paths inside the Dockerfile are relative to the repo root.

### `infra/docker/backend.Dockerfile`
- Base image: `node:24`
- `WORKDIR /app/apps/backend`
- No `COPY`, no `RUN npm install`, no `CMD` — all handled by compose `command` and volumes.

### `infra/docker/frontend.Dockerfile`
- Base image: `node:24`
- `WORKDIR /app/apps/frontend`

### `infra/docker/studio.Dockerfile`
- Base image: `node:24`
- `WORKDIR /app/apps/prisma`

### Why `/app/apps/<service>`?
The entire repository is bind-mounted to `/app` in compose. Setting `WORKDIR` to `/app/apps/<service>` means that when the container runs, the working directory matches the app's host path relative to the repo root. This ensures:
- Relative imports between apps (e.g., backend importing from `~prisma/`) resolve correctly.
- `node_modules/` at the app level is found by Node.js module resolution.
- TypeScript path aliases work identically in container and on host.

## Acceptance Criteria
1. `infra/docker/backend.Dockerfile` exists, uses `FROM node:24`, sets `WORKDIR /app/apps/backend`.
2. `infra/docker/frontend.Dockerfile` exists, uses `FROM node:24`, sets `WORKDIR /app/apps/frontend`.
3. `infra/docker/studio.Dockerfile` exists, uses `FROM node:24`, sets `WORKDIR /app/apps/prisma`.
4. No Dockerfile copies source code or runs `npm install`.
5. No Dockerfile specifies `CMD` — the command is defined in compose.

## Verification Scenario
1. Run `docker build -f infra/docker/backend.Dockerfile -t kotel-backend-dev .` from the repo root — verify it builds successfully.
2. Repeat for frontend and studio Dockerfiles.

## Testing
Manual verification only — build each image and confirm it completes without errors.

## Notes
- The `node:24` tag refers to the current Node.js 24.x LTS line. Do NOT use alpine variants — Prisma has known compatibility issues with musl libc in alpine images.
- These Dockerfiles are intentionally minimal for dev. Production Dockerfiles (multi-stage, with COPY and build steps) will be a separate future task.
