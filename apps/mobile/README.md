# Mobile App Manual Test Strategy

This document is the canonical source for running and manually validating the Expo mobile flow in this repository.

## Run And Stop Flow (Docker-Integrated)

Run from project root:

```bash
scripts/dev-start.sh
```

Expected behavior:
- Starts core services (`postgres`, `backend`, `frontend`, `studio`, `traefik`) in Docker.
- Attaches the current terminal to Expo CLI (`mobile`) in LAN mode.
- Prints mobile runtime networking values:
  - `EXPO_PUBLIC_API_BASE_URL=https://<HOST_IP>:3001/api`
  - `EXPO_PUBLIC_API_HOST_HEADER=kotel1.localhost`

Stopping:
- `Ctrl+C` stops only attached Expo process in the current terminal.
- `scripts/dev-stop.sh` stops all project dev containers.

## Environment And Networking

- Current scope target: **Android emulator** and **Android phone (Expo Go) via LAN QR**.
- `HOST_IP` must resolve from host machine to route emulator/phone API requests through Traefik.
- Mobile client expects backend API at `https://<HOST_IP>:3001/api` with host header `kotel1.localhost`.
- Alternative second backend endpoint over LAN: `https://<HOST_IP>:3002/api` (and `/.well-known` on `:3002`).
- Set `HOST_IP` explicitly in project `.env` for stable LAN QR behavior.
- `scripts/dev-start.sh` reads `HOST_IP` from env; quick one-run override:

```bash
HOST_IP=192.168.1.42 scripts/dev-start.sh
```

- LAN QR prerequisites for phone:
  - host and phone are on the same Wi-Fi SSID;
  - Wi-Fi client isolation is disabled;
  - host firewall allows inbound `8081`, `19000`, `19001`, `19002`, `3001`, `3002`.
- If API requests fail, confirm:
  - dev stack is running (`scripts/dev-start.sh`);
  - emulator and host can reach `<HOST_IP>`;
  - TLS certificate flow (`mkcert`) is available on host.

## Manual Checklist

### Users Tab (`app/(tabs)/users.tsx`)

1. Open **Users** tab.
2. Press `загрузить`.
3. Validate loading state appears: `Загрузка...`.
4. Validate one of the terminal states:
   - success: list of cards with `id/fullname/createdAt/updatedAt`;
   - empty success: `Нет данных`;
   - error: `Ошибка загрузки: <message>`.

### Session-Test Tab (`app/(tabs)/session-test.tsx`)

Use seeded credentials:
- `login`: `user1`
- `password`: `123`

1. Open **Session Test** tab.
2. Press `signin` and confirm:
   - temporary state: `Запрос выполняется...`;
   - JSON state becomes a user object (not `null`);
   - no error text is shown.
3. Press `check` and confirm JSON state remains a valid user object.
4. Press `signout` and confirm:
   - temporary state: `Запрос выполняется...`;
   - JSON state returns to `null`;
   - no error text is shown.
5. If any request fails, confirm error block appears as `Ошибка: <message>`.

## Testing Policy (Current Scope)

- Expo native app validation is **manual only** in this phase.
- Automated native Expo E2E is intentionally out of scope for now.
- Playwright in this repository remains focused on **web E2E** coverage and is not used for current native Expo flow.
