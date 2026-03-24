# Step 02: Create docs/STACK.md

## Goal

Create `docs/STACK.md` — a document that fixes the current tech stack, monorepo structure, TypeScript aliases, docker-compose topology, and key non-auth architectural decisions as they exist **right now**. No future plans, no aspirational design — only what is actually implemented.

## Motivation

There is currently no single place that describes the tech stack and repository structure. New contributors and AI agents have to explore the codebase to discover the monorepo layout, aliases, and how the apps connect to each other.

## Type

docs

## Affected Area

- `docs/STACK.md` — new file

## Dependencies

None. (Can be done in parallel with step 01.)

## Current Behavior

`docs/` contains only `AUTH_DESIGN.md` (and after step 01, `docs/auth/*.md`). No document describes:
- What technologies are used per app
- How the monorepo is structured (`apps/backend`, `apps/frontend`, `apps/mobile`, `apps/prisma`)
- What TypeScript path aliases are configured and what they resolve to
- How the docker-compose topology connects services in dev

## Expected Behavior

A readable `docs/STACK.md` file that covers all of the above in a structured way.

## Specification

Create `docs/STACK.md` with the following sections. Write all content by reading the actual source (package.json files, tsconfig files, compose file) — do not invent versions or settings.

---

### Section 1: Repository structure

Describe the top-level layout:

```
kotel/
├── apps/
│   ├── backend/      — NestJS backend (Node.js)
│   ├── frontend/     — React SPA (Vite)
│   ├── mobile/       — Expo mobile app (React Native)
│   └── prisma/       — shared Prisma schema, migrations, seed
├── docs/             — architecture documentation
├── infra/
│   ├── compose/      — Docker Compose files (dev.yml, test.yml)
│   ├── docker/       — Dockerfiles per service
│   └── traefik/      — Traefik config (traefik.yml, dynamic/tls.yml)
├── scripts/          — dev-start.sh, dev-stop.sh, test-start.sh
└── .env              — local environment variables
```

---

### Section 2: Tech stack per app

For each app, list: runtime/framework, key libraries, and test tooling. Read from each app's `package.json`. Focus on direct dependencies that matter architecturally; omit type packages and minor utilities.

**Backend (`apps/backend`)**:
- Runtime: Node.js
- Framework: NestJS
- ORM: Prisma (client generated from `apps/prisma`)
- Validation: Zod (Zod-first, no `class-validator`)
- Test: Vitest (unit + integration against Docker test containers)

**Frontend (`apps/frontend`)**:
- Bundler: Vite
- Framework: React
- Router: TanStack Router
- State: Jotai
- HTTP: axios + axios-auth-refresh
- Test: Vitest (unit/component), Playwright (E2E)

**Mobile (`apps/mobile`)**:
- Framework: Expo (Expo Router)
- HTTP: axios + axios-auth-refresh
- Token storage: expo-secure-store
- OAuth browser: expo-web-browser + expo-linking
- Crypto: expo-crypto
- Test: Vitest (unit — manual Expo E2E is out of scope)

**Prisma (`apps/prisma`)**:
- Prisma schema split across `schema/` directory (User.prisma, Session.prisma, schema.prisma)
- Migrations in `migrations/`
- Seed script in `seed/`
- Generated client output: `apps/prisma/client/` — imported by backend as `~prisma/client/client`

**Infrastructure**:
- Reverse proxy: Traefik v3 (TLS termination, routing by hostname)
- Database: PostgreSQL (one per backend instance in dev)
- TLS (dev): mkcert self-signed certificates for `*.localhost` domains

---

### Section 3: TypeScript aliases

List the path aliases that are currently configured. Read from `apps/backend/tsconfig.json`, `apps/frontend/tsconfig.json`, and `apps/mobile/tsconfig.json` (or `vite.config.ts`, `metro.config.js`).

Key aliases to document:
- `@contracts/*` (frontend) → `apps/backend/src/contracts/*` — shared Zod contract schemas imported by frontend
- `~prisma/*` (backend) → `apps/prisma/*` — Prisma generated client and types
- `@/*` (mobile) — internal mobile alias

For each alias, explain what it is used for in one sentence.

---

### Section 4: Docker Compose dev topology

Describe the services in `infra/compose/dev.yml` and how they connect. Read from the actual compose file.

Services to describe:
- `traefik` — reverse proxy, terminates TLS, routes by hostname
- `postgres` — PostgreSQL for primary backend
- `postgres-2` — PostgreSQL for secondary backend
- `backend` — NestJS app, hostname `kotel1.localhost`
- `backend-2` — NestJS app, hostname `kotel2.localhost`
- `frontend` — Vite dev server (served from `kotel1.localhost`)
- `studio` — Prisma Studio
- `mobile` — Expo CLI (LAN mode, attached terminal)

Include the routing rules: which hostnames route to which services.

---

### Section 5: Multi-server client architecture

Briefly describe the architectural principle (already in `docs/auth/overview.md` but worth a pointer here):

- One frontend SPA connects to N independent backend servers simultaneously.
- Sessions are keyed by server URL in the Jotai store (`serversAtom: Map<serverUrl, ServerSession>`).
- Each server has its own Prisma DB — they do not share data.
- Shared contracts (`@contracts/*`) allow frontend to import Zod schemas from backend without runtime coupling.

Keep this section short (5-8 lines) and link to `docs/auth/overview.md` and `docs/auth/clients.md` for details.

---

### Section 6: Test environments

Describe the two test environments:
- **Unit/integration tests**: Vitest, backend tests run against Docker test containers defined in `infra/compose/test.yml`. Required env: `TEST_SESSION_COOKIE_DOMAIN`, `TEST_IDLE_TIMEOUT` (see `.cursor/rules/testing.mdc`).

Wait — `IDLE_TIMEOUT` is being removed in step 04. The agent writing this doc should write what is accurate AFTER step 04. So just mention `TEST_SESSION_COOKIE_DOMAIN`.

Actually, this step is independent of step 04. Instruct the agent: if `IDLE_TIMEOUT` has already been removed from the codebase (step 04 completed), do not mention it. If it hasn't, note it is being removed.

- **E2E tests**: Playwright, runs against the full dev stack (`infra/compose/dev.yml`). Tests in `apps/frontend/e2e/`.

---

## Acceptance Criteria

1. `docs/STACK.md` exists.
2. Contains all 6 sections: repository structure, stack per app, TS aliases, docker topology, multi-server architecture note, test environments.
3. All technology versions and library names are accurate (read from actual `package.json` files, not from memory).
4. No future features or aspirational content — only what is currently implemented.
5. Links to `docs/auth/overview.md` and `docs/auth/clients.md` where relevant.

## Verification Scenario

1. Open `docs/STACK.md`.
2. Find the aliases section — verify `@contracts/*` is listed with correct resolution path.
3. Find the Docker topology section — verify service names match `infra/compose/dev.yml`.
4. Find the mobile section — verify it mentions expo-secure-store and expo-web-browser.

## Testing

Manual only — documentation.

## Notes

- Read `apps/backend/package.json`, `apps/frontend/package.json`, `apps/mobile/package.json`, `infra/compose/dev.yml`, and relevant tsconfig/vite/metro config files to populate the document.
- Do not hardcode version numbers unless they are significant architectural decisions (e.g., Prisma major version).
- Write in Russian (consistent with `AUTH_DESIGN.md`).
