# Step 01: Add mobile dev container and attached start flow

## Goal
Integrate the existing `apps/mobile` Expo project into the development docker stack and make `scripts/dev-start.sh` keep the terminal attached to the mobile container after core services are started.

## Motivation
The team needs Expo QR controls and interactive CLI output in the active terminal during local development, while backend/frontend/database services continue to run in the same dev environment.

## Type
infra, feature

## Affected Area
`infra/compose/dev.yml`, `infra/docker/Dockerfile.mobile.dev`, `scripts/dev-start.sh`, `scripts/dev-stop.sh`, `README.md` (or another existing dev-run entrypoint doc).

## Dependencies
None.

## Current Behavior
`scripts/dev-start.sh` runs `docker compose ... up -d --build` and exits.  
`infra/compose/dev.yml` defines `postgres`, `backend`, `frontend`, `studio`, and `traefik`, but no `mobile` service.  
`apps/mobile` exists but is not included in the shared dev startup flow.

## Expected Behavior
Running `scripts/dev-start.sh` should:
- build/start infrastructure services in background;
- start the `mobile` service in attached mode in the same terminal;
- keep Expo CLI active so QR/hotkeys are visible;
- run Expo in LAN mode (`expo start --lan`) inside the container.

## Specification
Create `infra/docker/Dockerfile.mobile.dev` for Expo development:
- base on Node image compatible with `apps/mobile` dependencies;
- set working directory to `/apps/mobile`;
- install mobile dependencies (`npm ci` or equivalent deterministic install path);
- expose ports needed by Expo dev server and LAN discovery flow.

Update `infra/compose/dev.yml`:
- add `mobile` service using the new Dockerfile;
- mount `${PROJECT_ROOT}/apps` into the container consistently with existing services;
- set `working_dir: /apps/mobile`;
- define command for Expo LAN mode (`npx expo start --lan`);
- pass environment values required by later steps (API URL + host header placeholders);
- do not place `mobile` behind Traefik router as an HTTP app endpoint.

Update `scripts/dev-start.sh`:
- keep the current background bootstrap for core services;
- start `mobile` in attached mode after bootstrap (for example with compose run/up attach behavior that does not daemonize);
- print short guidance before attaching (what to expect in terminal);
- preserve script safety checks (`set -euo pipefail`, tool checks).

Update `scripts/dev-stop.sh` if needed so it stops `mobile` together with other services.

Document the changed behavior:
- `dev-start.sh` now keeps terminal attached until the user stops Expo;
- explain how to stop (`Ctrl+C` for attached process + `scripts/dev-stop.sh` for full stack when needed).

## Acceptance Criteria
1. `infra/compose/dev.yml` contains a `mobile` service wired to `apps/mobile` and Expo LAN start command.
2. A new `infra/docker/Dockerfile.mobile.dev` exists and is referenced by the compose service.
3. `scripts/dev-start.sh` no longer exits immediately after `up -d`; it attaches to mobile and keeps interactive Expo output in terminal.
4. Terminal output from `dev-start.sh` shows Expo QR/hotkeys after infrastructure startup.
5. Stopping the dev environment still works through the existing stop script flow.

## Verification Scenario
1. Run `scripts/dev-start.sh`.
2. Wait for compose bootstrap to complete.
3. Verify that the script remains active and Expo CLI output appears in the same terminal.
4. Verify Expo is started in LAN mode.
5. Stop the attached process and run `scripts/dev-stop.sh`.
6. Verify no dev containers remain running.

## Testing
Manual-only verification:
- startup/attach behavior;
- container lifecycle (`start`/`stop`);
- Expo CLI visibility in terminal.

No new automated tests are required for this infra step.

## Notes
Reserve stable env variable names for mobile runtime configuration in this step so API wiring in later steps does not require compose-level rework.
