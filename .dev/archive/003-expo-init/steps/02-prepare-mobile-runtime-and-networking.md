# Step 02: Prepare mobile runtime and networking

## Goal
Set up the mobile app runtime foundation (state/query/api tooling and network config) so Expo Android emulator can call backend APIs through Traefik over HTTPS using host-IP routing and `Host: kotel.localhost`.

## Motivation
The mobile app must replicate backend-testing flows from frontend pages, and those flows depend on working HTTPS API access and session behavior in the emulator.

## Type
infra, backend, feature

## Affected Area
`apps/mobile/package.json`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile` networking/config modules (new files), and mobile env wiring from `infra/compose/dev.yml`.

## Dependencies
Depends on step 01.

## Current Behavior
`apps/mobile` is the default Expo template:
- no React Query provider;
- no Jotai state;
- no Axios API layer;
- no backend base URL/host-header runtime configuration.

Frontend already uses:
- `axios` API modules (`apps/frontend/src/api/*`);
- React Query in `main.tsx` and query options modules;
- Jotai for session state (`apps/frontend/src/state/session.ts`).

## Expected Behavior
Mobile runtime should provide:
- `axios` API client layer for backend requests;
- React Query setup for query-driven screens;
- Jotai atoms for session state parity;
- configurable API endpoint using real host IP and HTTPS Traefik port;
- request host override target `kotel.localhost` (as required by selected routing approach);
- Android emulator as the only supported runtime target for this scope.

## Specification
Install/add dependencies in `apps/mobile` for parity with frontend architecture:
- `axios`;
- `@tanstack/react-query`;
- `jotai`;
- any minimal helper dependency needed for request throttling only if explicitly used (optional).

Create a shared API configuration module in `apps/mobile`:
- define `EXPO_PUBLIC_API_BASE_URL` (for example: `https://<HOST_IP>/api`);
- define `EXPO_PUBLIC_API_HOST_HEADER` with default `kotel.localhost`;
- validate missing/empty values early with explicit startup error message.

Create an Axios client module for mobile:
- baseURL from env config;
- JSON defaults;
- request-level host override set to configured host header;
- include cookie/session-friendly behavior where supported by React Native transport.

Create mobile app providers:
- QueryClient instance and `QueryClientProvider`;
- Jotai `Provider` if required by architecture;
- wrap Expo Router tree in providers from `app/_layout.tsx`.

Update tabs layout baseline in `app/(tabs)/_layout.tsx`:
- prepare tab entries for `users` and `session-test` screens that will be implemented in following steps;
- remove/replace starter tabs (`index`, `explore`) as needed to avoid dead template routes.

Ensure compose/env integration from step 01 provides runtime values:
- real host IP and HTTPS port path for emulator access;
- host header value for backend routing through Traefik.

## Acceptance Criteria
1. `apps/mobile` dependencies include `axios`, `@tanstack/react-query`, and `jotai`.
2. Mobile root layout wraps navigation with React Query (and Jotai if used).
3. A central mobile API config exists and reads Expo public env variables.
4. Mobile HTTP client is configured for HTTPS host-IP base URL and host header override target `kotel.localhost`.
5. Tabs layout is prepared for `users` and `session-test` routes instead of starter template tabs.

## Verification Scenario
1. Start environment with `scripts/dev-start.sh`.
2. Open Expo app in Android emulator.
3. Navigate to mobile app startup; verify app boots without provider/config crashes.
4. Confirm logs show resolved API base URL configuration (non-empty and expected format).
5. Confirm tabs render planned entries for upcoming feature screens.

## Testing
Manual-only:
- emulator boot with providers;
- env/config correctness;
- API config sanity (no empty URL or malformed host).

No automated test implementation is required in this step.

## Notes
Keep this step focused on shared runtime plumbing; do not implement page-specific business UI here.
