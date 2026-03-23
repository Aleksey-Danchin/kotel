## Step 03: Remove old session code and enable CORS
- `docker compose -f infra/compose/dev.yml ...` requires `PROJECT_ROOT` exported (or `--project-directory` set), otherwise compose fails on variable interpolation.
- After removing legacy session/backend code, restarting `kotel-backend-1` can be required to recover dev health from transitional runtime failures.
