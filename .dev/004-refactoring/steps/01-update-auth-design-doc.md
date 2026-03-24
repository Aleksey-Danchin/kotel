# Step 01: Update AUTH_DESIGN.md with implementation decisions

## Goal
Amend `docs/AUTH_DESIGN.md` to reflect implementation-specific decisions made during Q&A, so the document stays the single source of truth for auth architecture.

## Motivation
The Q&A session produced concrete choices (hashing algorithm, token generation strategy, deep-link scheme, role model, etc.) that diverge from or extend the original conceptual document. Capturing them avoids future ambiguity.

## Type
documentation

## Affected Area
- `docs/AUTH_DESIGN.md`

## Dependencies
None

## Current Behavior
AUTH_DESIGN.md is a conceptual design document. It uses placeholder names (`messenger://`), leaves some decisions open (token generation, hashing algorithm, code storage), and does not mention the `root` role.

## Expected Behavior
AUTH_DESIGN.md contains an **"Implementation Decisions"** appendix section (before `## Известные ограничения`) documenting:

1. **Token hashing**: SHA-256. Consistent with PKCE (RFC 7636).
2. **Token generation**: `crypto.randomBytes(32).toString('hex')` — 256 bits from CSPRNG. Not CUID.
3. **Auth code storage**: In-memory `Map` with TTL. Codes are short-lived (30–60 s) and lost on restart (acceptable).
4. **Deep-link scheme**: `kotel://` replaces `messenger://` throughout the doc.
5. **Roles**: Three-tier `user | admin | root`. `root` — superadmin, only one per server, cannot be deleted, created at first-run setup. `admin` duplicates root capabilities except: cannot manage other admins, can be assigned/removed only by root.
6. **Atomic refresh rotation**: Raw SQL via `prisma.$queryRaw` (`UPDATE … WHERE status = 'active' RETURNING`).
7. **SameSite cookie policy**: `SameSite=None` always.
8. **Login page**: Static HTML served by the backend (NestJS `ServeStaticModule`), MVP — no styling.
9. **Callback page (web)**: `/callback` route in the frontend SPA (TanStack Router).
10. **Configuration**: Environment variables (`process.env.*`), no YAML config, no `@nestjs/config`.
11. **First-run setup**: `GET /api/setup/status` + `POST /api/setup/init` — creates root user when zero users exist. After setup, user goes through normal OAuth login.
12. **Multi-server client**: Full implementation — Jotai store keyed by server URL, sidebar navigation.
13. **Two-server dev environment**: `kotel.localhost` + `katel.localhost`, each with own PostgreSQL and backend, shared Traefik, single frontend.

Additionally perform a global find-and-replace of `messenger://` → `kotel://`.

## Specification
Add `## Implementation Decisions` section. Each item is a subsection with short rationale referencing the original section it relates to. Replace `messenger://` → `kotel://` everywhere.

Do not change the conceptual content or structure of existing sections.

## Acceptance Criteria
1. New `## Implementation Decisions` section exists with all 13 items.
2. Zero occurrences of `messenger://` in the file.
3. Multiple occurrences of `kotel://` in Deep Links section and Implementation Decisions.
4. All original sections remain intact.

## Verification Scenario
1. Open `docs/AUTH_DESIGN.md`.
2. Search for `## Implementation Decisions` — present.
3. Search for `messenger://` — zero results.
4. All prior sections unchanged.

## Testing
Manual verification only.

## Notes
This step must be completed first because subsequent steps reference AUTH_DESIGN.md as the authoritative specification.
