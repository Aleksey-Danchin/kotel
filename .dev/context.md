## Step 02: Remove Designer Test Artifacts
- Repository does not contain `scripts/prettier.sh`; use existing project scripts instead of the missing prettier wrapper when formatting is required.

## Step 03: Fix Configurator Layout And Navigation UX
- In this repository, direct `docker compose` calls may fail without required env vars (`PROJECT_ROOT`, `EXPO_PUBLIC_API_BASE_URL`); fallback health checks can be done via `docker ps` name/status filtering.
