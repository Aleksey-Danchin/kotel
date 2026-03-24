# Step 05: Docker Compose Dev Manifest

## Goal
Create a single Docker Compose manifest at `infra/compose/dev.yml` that defines all development services: postgres, backend, frontend, prisma studio, and traefik. Every service must have a health check. The stack must be fully functional when started with the dev scripts (step 06).

## Motivation
This is the central orchestration file for the dev environment. It wires together all Dockerfiles (step 02), Traefik config (step 03), environment variables (step 01), and backend configuration (step 04) into a running development stack.

## Type
infra

## Affected Area
- `infra/compose/dev.yml` (new)

## Dependencies
Depends on steps 01, 02, 03, 04.

## Current Behavior
No compose manifest exists. No `infra/compose/` directory exists.

## Expected Behavior
`infra/compose/dev.yml` defines 5 services, a custom network, and a named volume. Running `docker compose -f infra/compose/dev.yml up` from the project root starts the entire dev stack with all containers reaching `healthy` status.

## Specification

### Top-Level Structure
```yaml
name: kotel

services:
  postgres: ...
  backend: ...
  frontend: ...
  studio: ...
  traefik: ...

volumes:
  postgres-data:

networks:
  kotel-net:
```

### Paths Convention
The compose file is at `infra/compose/dev.yml`. All relative paths in the file are relative to the **project root**, NOT to the compose file's directory. This is ensured by running compose with `--project-directory` pointing to the repo root (handled by the dev-start script in step 06).

In the specification below, all host paths are written relative to the project root.

### Service: `postgres`
- **Image:** `postgres:18.3`
- **Environment:** `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — taken from the `.env` file via compose variable interpolation: `${POSTGRES_DB}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`.
- **Volumes:** `postgres-data:/var/lib/postgresql/data`
- **Ports:** `${POSTGRES_PORT}:5432` — exposes postgres to the host for dev tooling (pgAdmin, DBeaver, etc.).
- **Networks:** `kotel-net`
- **Healthcheck:** `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}` with reasonable interval/timeout/retries (e.g., interval 5s, timeout 3s, retries 10).
- **Restart:** `unless-stopped`

### Service: `backend`
- **Build:** context `../..` (= project root from compose file location), dockerfile `infra/docker/backend.Dockerfile`.
- **Command:** `nest start --watch --webpack -r tsconfig-paths/register`
- **Volumes:** bind-mount the entire repo: `../..:/app` (project root → `/app` in container). Full bind-mount including `node_modules`.
- **Working directory:** `/app/apps/backend` (should match Dockerfile WORKDIR but explicit in compose for clarity).
- **Environment:**
  - `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}` — assembled from `.env` vars. Note: the host is the docker service name `postgres` (hardcoded), and the port is the internal port `5432` (hardcoded).
  - `PORT=3000`
- **Ports:** No host port mapping — access is through Traefik only.
- **Networks:** `kotel-net`
- **Depends on:** `postgres` (condition: `service_healthy`)
- **Healthcheck:** `curl -f http://localhost:3000/api || exit 1` with interval 10s, timeout 5s, retries 10, start_period 30s. The `/api` endpoint is the default `AppController` route with the global prefix set in step 04.
- **Labels (Traefik routing):**
  - `traefik.enable=true`
  - `traefik.http.routers.backend.rule=Host(\`kotel.localhost\`) && PathPrefix(\`/api\`)`
  - `traefik.http.routers.backend.entrypoints=websecure`
  - `traefik.http.routers.backend.tls=true`
  - `traefik.http.routers.backend.priority=100` (higher than frontend to match `/api` first)
  - `traefik.http.services.backend.loadbalancer.server.port=3000`

### Service: `frontend`
- **Build:** context `../..`, dockerfile `infra/docker/frontend.Dockerfile`.
- **Command:** `npx vite --host`
  - `--host` (without value) binds to `0.0.0.0`, making the dev server accessible from outside the container.
- **Volumes:** `../..:/app`
- **Working directory:** `/app/apps/frontend`
- **Ports:** No host port mapping — access is through Traefik only.
- **Networks:** `kotel-net`
- **Healthcheck:** `curl -f http://localhost:5173 || exit 1` with interval 10s, timeout 5s, retries 10, start_period 20s.
- **Labels (Traefik routing):**
  - `traefik.enable=true`
  - `traefik.http.routers.frontend.rule=Host(\`kotel.localhost\`)`
  - `traefik.http.routers.frontend.entrypoints=websecure`
  - `traefik.http.routers.frontend.tls=true`
  - `traefik.http.routers.frontend.priority=1` (lower than backend — catch-all)
  - `traefik.http.services.frontend.loadbalancer.server.port=5173`

### Service: `studio`
- **Build:** context `../..`, dockerfile `infra/docker/studio.Dockerfile`.
- **Command:** `npx prisma studio`
- **Volumes:** `../..:/app`
- **Working directory:** `/app/apps/prisma`
- **Environment:**
  - `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}` — same assembly as backend.
- **Ports:** `5555:5555` — direct access, no Traefik.
- **Networks:** `kotel-net`
- **Depends on:** `postgres` (condition: `service_healthy`)
- **Healthcheck:** `curl -f http://localhost:5555 || exit 1` with interval 10s, timeout 5s, retries 10, start_period 20s.
- **Labels:** `traefik.enable=false` (explicit opt-out).

### Service: `traefik`
- **Image:** `traefik:v3` (latest v3 stable).
- **Ports:**
  - `80:80` (HTTP, for redirect)
  - `443:443` (HTTPS)
- **Volumes:**
  - `/var/run/docker.sock:/var/run/docker.sock:ro` — Docker provider.
  - `./infra/traefik/traefik.yml:/etc/traefik/traefik.yml:ro` — static config (path relative to project root via `--project-directory`).
  - `./infra/traefik/dynamic:/etc/traefik/dynamic:ro` — dynamic config directory.
  - `${MKCERT_CAROOT:-${HOME}/.local/share/mkcert}/kotel:/certs:ro` — TLS certificates. Uses `MKCERT_CAROOT` env var if set, falls back to the standard Linux default.
- **Networks:** `kotel-net`
- **Depends on:** `backend` and `frontend` (condition: `service_healthy`)
- **Healthcheck:** `wget --spider -q http://localhost:8082/ping || exit 1` with interval 10s, timeout 3s, retries 5. This requires enabling the `ping` entrypoint in the Traefik static config (add entrypoint `ping` on port 8082 and `ping.entryPoint: ping` in `infra/traefik/traefik.yml`).
- **Restart:** `unless-stopped`

### Network: `kotel-net`
Default bridge network. The name `kotel-net` must match the Docker provider network in the Traefik static config.

### Volume: `postgres-data`
Named volume for postgres data persistence.

### Environment Variable Interpolation
The compose file uses `${VARIABLE}` syntax for variable substitution. Docker Compose resolves these from the `.env` file in the project directory (the directory passed via `--project-directory`).

For `DATABASE_URL`, the value is assembled inline in the compose file:
```
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```
The `postgres` hostname and `5432` port are hardcoded because they refer to the Docker-internal service name and port, which never change.

## Acceptance Criteria
1. `infra/compose/dev.yml` exists and is valid YAML.
2. Five services are defined: `postgres`, `backend`, `frontend`, `studio`, `traefik`.
3. Every service has a `healthcheck` section.
4. `postgres` uses image `postgres:18.3` and a named volume `postgres-data`.
5. `backend` build uses `infra/docker/backend.Dockerfile` with context at repo root.
6. `backend` command is `nest start --watch --webpack -r tsconfig-paths/register`.
7. `frontend` command includes `--host` flag for Vite.
8. `studio` exposes port `5555` directly (no Traefik).
9. `traefik` mounts Docker socket, config files, and mkcert certs.
10. Backend Traefik router matches `Host(\`kotel.localhost\`) && PathPrefix(\`/api\`)` with higher priority than frontend.
11. Frontend Traefik router matches `Host(\`kotel.localhost\`)` as a catch-all.
12. `DATABASE_URL` is assembled from individual `.env` variables in the compose file for both backend and studio.
13. `docker compose -f infra/compose/dev.yml config` (run from project root) validates without errors.

## Verification Scenario
1. From the project root, run `docker compose --project-directory . -f infra/compose/dev.yml config` — verify valid output with all services, interpolated variables, and correct paths.
2. Inspect the output to confirm `DATABASE_URL` is properly assembled.
3. Confirm health check commands are present for all services.

## Testing
Syntax validation via `docker compose config`. Full integration test is deferred to step 06 (dev scripts) which starts the actual stack.

## Notes
- The cert volume mount uses `${MKCERT_CAROOT:-${HOME}/.local/share/mkcert}` as a fallback. The `dev-start.sh` script (step 06) will export `MKCERT_CAROOT` from `mkcert -CAROOT` before calling compose, ensuring correctness on any system.
- The Traefik healthcheck requires a `ping` entrypoint — update the Traefik static config from step 03 to include `entryPoints.ping.address: ":8082"` and `ping.entryPoint: "ping"` if not already present.
- Build context `../..` is relative to the compose file at `infra/compose/dev.yml`. With `--project-directory .` (repo root), Docker resolves this correctly to the repo root. The implementing agent should verify whether `--project-directory` changes context resolution or if the context should be `.` (project root) instead of `../..`. Test with `docker compose config` to confirm.
- All services share the `kotel-net` network, enabling inter-container DNS resolution by service name.

<CORRECTION by="step-executor" reason="compose path resolution with --project-directory">
`docker compose --project-directory . -f infra/compose/dev.yml config` resolves `../..` from the compose file location to `/home/aleksey`, not the repository root. To keep build context and bind mounts rooted at the project directory, use `context: .` and `.:/app` in this step implementation.
</CORRECTION>

<CORRECTION by="step-executor" reason="postgres:18 runtime compatibility">
`postgres:18.3` fails to start with a direct mount on `/var/lib/postgresql/data` and requests a parent mount path for cluster layout. The implementation uses named volume `postgres-data` mounted at `/var/lib/postgresql` to keep the service healthy while preserving the required named volume.
</CORRECTION>

<CORRECTION by="step-executor" reason="container command runtime behavior">
With `node:24` base images and bind-mounted workspace, plain `nest ...` command is treated as a Node entry script when the binary is not in PATH, causing startup failure. The implementation uses `npx nest ...` for backend and `npx prisma studio --browser none --port 5555` for studio to ensure both services stay running in containers.
</CORRECTION>
