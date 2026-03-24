# Step 24: Two-server dev environment (Traefik + second DB/backend)

## Goal
Configure the development Docker Compose stack with two independent servers (`kotel.localhost` and `katel.localhost`) behind Traefik, for testing the multi-server frontend.

## Motivation
The frontend multi-server feature needs at least two actual backend instances to test against. Each server needs its own PostgreSQL database and backend process.

## Type
infra

## Affected Area
- `infra/compose/dev.yml` — add second database, second backend, Traefik routing

## Dependencies
Depends on Step 03 (CORS enabled), Step 14 (setup endpoint for initializing second server).

## Current Behavior
Single backend (`kotel.localhost`), single PostgreSQL database, Traefik proxy.

## Expected Behavior

### Second PostgreSQL instance

```yaml
db2:
  image: postgres:17
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: kotel2
  volumes:
    - db2_data:/var/lib/postgresql/data
```

### Second backend instance

```yaml
backend2:
  build: ../..
  dockerfile: infra/docker/dev.Dockerfile
  environment:
    DATABASE_URL: postgresql://postgres:postgres@db2:5432/kotel2
    SESSION_COOKIE_DOMAIN: .localhost
    RECOMMENDED_CLIENT_URL: https://kotel.localhost
    REUSE_DETECTION_MODE: quarantine
  depends_on:
    - db2
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.backend2.rule=Host(`katel.localhost`) && PathPrefix(`/api`)"
    - "traefik.http.routers.backend2.tls=true"
    - "traefik.http.services.backend2.loadbalancer.server.port=4000"
```

### Traefik routing

Two backend routers:
- `kotel.localhost/api/*` → backend (existing)
- `katel.localhost/api/*` → backend2 (new)

Frontend only at `kotel.localhost` (non-api routes).

### Volume for second database

```yaml
volumes:
  db_data:
  db2_data:
```

### `.well-known/client` routing

Both backends have `.well-known/client` outside `/api/` prefix, so Traefik needs:
```
Host(`katel.localhost`) && PathPrefix(`/.well-known`)
```

### Migration and seed for second database

The second backend needs its own migration and seed on first start. This can be done manually or via an entrypoint script that runs `npx prisma migrate deploy && npx prisma db seed`.

## Specification

1. Add `db2` service to `dev.yml`.
2. Add `backend2` service with own `DATABASE_URL` pointing to `db2`.
3. Add Traefik routing for `katel.localhost`.
4. Add `db2_data` volume.
5. Add `.well-known` routing rule for second backend.
6. Document setup steps in a comment or README.

## Acceptance Criteria
1. `docker compose -f infra/compose/dev.yml up` starts both backends.
2. `https://kotel.localhost/api/users` → backend 1.
3. `https://katel.localhost/api/users` → backend 2.
4. Frontend at `https://kotel.localhost` can connect to both servers.
5. Each backend has independent database and sessions.
6. `GET https://katel.localhost/.well-known/client` returns recommended client URL.

## Verification Scenario
1. Start stack: `docker compose -f infra/compose/dev.yml up`.
2. Frontend: add `https://kotel.localhost` as first server → OAuth → connected.
3. Frontend: add `https://katel.localhost` as second server → setup → OAuth → connected.
4. Sidebar shows both servers.

## Testing
Manual infrastructure testing.

## Notes
- `SESSION_COOKIE_DOMAIN=.localhost` — the dot-prefixed domain covers both `kotel.localhost` and `katel.localhost`. Both servers can share cookies if needed, but since they have different hostnames, cookies are scoped independently by the browser (path + domain).
- The second server starts empty — use `/setup` page to create root user.
- `katel.localhost` is an intentional typo (swapped letters) to create a visually distinct second server name.
