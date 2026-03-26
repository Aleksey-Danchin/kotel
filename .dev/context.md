## Step 05: Implement General and Configurator settings tabs
- For `apps/designer` Vitest runs in test Docker, set working directory to `/apps/designer`; default `/apps/frontend` only discovers frontend tests.

## Step 06: Implement Users settings tab
- `scripts/prettier.sh` is absent in this repository; do not assume it exists in next steps.

## Step 01: Restructure mock catalog and identity fields (re-validation)
- For `apps/designer` tests, `kris-frontend-test` can execute them with `cd /apps/designer` inside container.

## Step 01: Restructure mock catalog and identity fields (retry #2)
- `apps/designer` runtime at `http://localhost:5173` can fail on route split imports when `ChatMessageList` depends on `@tanstack/react-virtual`; replacing with non-virtual list restores browser validation flow.

## Step 07: Implement Account settings tab and session management (validation pass)
- In `SettingsOverlay`, confirmation flows for session actions should not always depend on `selectedServer`; route/session drift can leave `selectedServer` null while global session actions are still valid.
