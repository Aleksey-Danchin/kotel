# ROAD_MAP

Снимок состояния проекта на текущий момент (после шагов 01–08 текущего раунда).
Документ основан на фактическом коде и тестах в репозитории.

## 1) Что реализовано

### Инфраструктура и окружение

- Локальное dev-окружение в Docker Compose: `infra/compose/dev.yml`.
- Два backend-инстанса и два домена для web-клиента: `kotel1.localhost` и `kotel2.localhost` (Traefik + TLS).
- HTTPS-маршрутизация через Traefik, сертификаты из `mkcert`-каталога.
- Отдельный test-стек в `infra/compose/test.yml` (`backend-test`, `frontend-test`, `postgres-test`, `studio-test`, `traefik-test`).
- Mobile dev-поток через Expo с `HOST_IP` и LAN-доступом.

### Backend

- OAuth 2.0 login/code exchange:
  - HTML login-страница (`/api/auth/login` GET),
  - выдача authorization code (`/api/auth/login` POST),
  - обмен code -> токены (`/api/auth/token`).
- PKCE S256-проверка при обмене кода (code verifier/challenge).
- In-memory code store (`Map`) с TTL 60 секунд и периодической очисткой.
- Stateful sessions в PostgreSQL через Prisma:
  - access/refresh токены хешируются SHA-256 перед записью в БД,
  - создание/ротация/отзыв сессий.
- Refresh rotation с атомарным переходом `ACTIVE -> USED` через `UPDATE ... RETURNING` (защита от гонки при повторном использовании refresh token).
- Reuse detection и режимы реакции: `debug`, `isolation`, `quarantine`, `lockdown`.
- Проверка канала доставки токена:
  - `WEB` ожидает cookie,
  - `EXPO` ожидает Bearer.
- Проверка origin/fingerprint на каждом защищенном запросе:
  - для `GET` логируется предупреждение,
  - для non-GET запрос отклоняется.
- Cleanup просроченных сессий при старте и по интервалу (час).
- Session API: статус, refresh, logout (текущая сессия / все устройства).
- Setup API первого запуска:
  - `GET /api/setup/status`,
  - `POST /api/setup/init` (одноразовая инициализация ROOT).
- Well-known endpoint: `GET /.well-known/client` с `recommended_client`.
- Role-based access (`USER`, `ADMIN`, `ROOT`): `RolesGuard` + admin API:
  - создание/список/удаление пользователей,
  - принудительный отзыв сессий.
- Rate limiting на `POST /api/auth/login`:
  - sliding window по IP,
  - отдельный счетчик по username,
  - пороги CAPTCHA и блокировки.

### Frontend (web SPA)

- Мультисерверное состояние на Jotai: сессии хранятся отдельно по `serverUrl`.
- OAuth popup flow с PKCE + `state`, callback через `postMessage`.
- Маршрут `/callback` как мост между popup и основным окном.
- Axios-клиент на сервер с `axios-auth-refresh` и `withCredentials`.
- SharedWorker для дедупликации refresh между вкладками.
- Sidebar:
  - список подключенных серверов,
  - выбор активного сервера,
  - форма добавления нового сервера.
- Setup-страница `/setup` для первичной инициализации root-пользователя.
- API logout c очередью повторов в памяти браузера при сетевых сбоях.

### Mobile (Expo)

- OAuth flow через системный браузер (`expo-web-browser`) и deep link callback (`kotel://auth/callback`).
- PKCE на `expo-crypto`.
- Хранение access/refresh токенов в `expo-secure-store`.
- Per-server axios-клиент с `axios-auth-refresh`.
- Session API-обертки: статус, refresh, logout.
- Mobile servers state на Jotai.
- LAN workaround: для IPv4-хостов `https://` понижается до `http://` на mobile-клиенте.

## 2) Тестовое покрытие (фактически существующие файлы)

Ниже перечислены тестовые файлы, которые фактически есть в репозитории.

### Backend (Vitest, unit + integration)

- `apps/backend/src/auth/auth.service.spec.ts` — login/exchangeCode, PKCE, WEB/EXPO ответы.
- `apps/backend/src/auth/auth.controller.spec.ts` — login page, rate limiting, captcha flag, token exchange.
- `apps/backend/src/auth/code-store.spec.ts` — хранение/поглощение/TTL auth code.
- `apps/backend/src/auth/rate-limiter.spec.ts` — sliding window лимиты по IP и username.
- `apps/backend/src/session/alertness.spec.ts` — разбор `REUSE_DETECTION_MODE`.
- `apps/backend/src/session/session.guard.spec.ts` — извлечение токена, origin/channel проверки.
- `apps/backend/src/session/session.service.spec.ts` — ротация, reuse/channel mismatch реакции, revoke/expire/cleanup.
- `apps/backend/src/session/session.module.spec.ts` — периодический cleanup lifecycle.
- `apps/backend/src/session/session.guard.integration.spec.ts` — guard на реальной БД, WEB/EXPO и mismatch.
- `apps/backend/src/session/session.controller.integration.spec.ts` — refresh rotation, logout/logout all, reuse modes.
- `apps/backend/src/setup/setup.service.spec.ts` — setup status/init и lockout.
- `apps/backend/src/setup/setup.controller.integration.spec.ts` — setup API и `.well-known/client`.
- `apps/backend/src/admin/roles.guard.spec.ts` — role enforcement для guard.
- `apps/backend/src/admin/admin.service.spec.ts` — create/list/delete/revoke для ADMIN/ROOT.
- `apps/backend/src/admin/admin.controller.integration.spec.ts` — admin API end-to-end в контейнерах.
- `apps/backend/src/shared/token-cookie.constants.spec.ts` — cookie domain/options и TTL defaults.
- `apps/backend/src/shared/token.utils.spec.ts` — generate/hash token.
- `apps/backend/src/contracts/contracts.schemas.spec.ts` — Zod-схемы контрактов.
- `apps/backend/test/vitest-alias.spec.ts` — smoke-test алиасов и test-runtime.

### Frontend web (Vitest unit)

- `apps/frontend/src/api/auth.test.ts` — OAuth popup flow, state validation, multi-server flows, rehydrate.
- `apps/frontend/src/api/create-server-client.test.ts` — per-server axios client, refresh interceptor, fallback без SharedWorker.
- `apps/frontend/src/api/logout.test.ts` — очередь logout retry и поведение при ошибках.
- `apps/frontend/src/state/servers.test.ts` — Jotai store, active server, localStorage persistence.
- `apps/frontend/src/components/sidebar.test.tsx` — рендер сайдбара, пустое состояние, активный сервер.
- `apps/frontend/src/workers/shared-refresh-worker.test.ts` — dedup refresh, broadcast, timeout, invalid messages.

### Frontend web (Playwright E2E)

- `apps/frontend/e2e/auth/oauth-flow.spec.ts` — OAuth popup flow, multi-server, invalid credentials.
- `apps/frontend/e2e/auth/session-lifecycle.spec.ts` — refresh/logout/logout all devices.
- `apps/frontend/e2e/auth/setup-flow.spec.ts` — setup init, lockout, последующий login.

### Mobile (Vitest unit)

- `apps/mobile/src/api/auth.test.ts` — `addMobileServer`, state check, token exchange, LAN downgrade.
- `apps/mobile/src/api/create-server-client.test.ts` — mobile axios client, bearer injection, refresh flow.
- `apps/mobile/src/api/secure-store.test.ts` — secure store сохранение/чтение/очистка токенов.
- `apps/mobile/src/api/session.test.ts` — status/refresh/logout API-методы.
- `apps/mobile/src/state/servers.test.ts` — mobile atoms (`servers`, `activeServerUrl`, `activeServerSession`).

## 3) Известные ограничения и технический долг

- Mobile HTTP downgrade для LAN (IPv4 `https -> http`) в Expo-клиенте.
- Mobile OAuth callback screen в приложении — заглушка/технический экран редиректа.
- Logout retry queue в web-клиенте хранится в памяти вкладки и теряется при закрытии.
- Deep-link hijacking риск на Android custom scheme (`kotel://`) принят как ограничение (ожидаемый DoS-вектор, не прямой захват аккаунта).
- Канал `notify_user` не реализован архитектурно в lock-down сценариях; автоматические каналы уведомлений отсутствуют.
- `notify_admin` также не реализован как отдельный рабочий канал уведомлений.
- Rate limiter и его счетчики полностью in-memory (сброс при рестарте; нет Redis/shared state).
- CAPTCHA интеграция не завершена: backend выставляет `captchaRequired`, но полноценный challenge/verification не подключен.
- DPoP (RFC 9449) описан как отложенный этап и в коде не реализован.
- Автоматизированные E2E для Expo/mobile не добавлены (покрытие мобильного клиента сейчас unit-уровня).

## 4) Архитектурные риски

- `CodeStore` в backend — single-process in-memory `Map`; горизонтальное масштабирование backend (несколько реплик) сломает надежный code exchange без внешнего хранилища.
- Короткий TTL auth code (60 секунд) усиливает безопасность, но может ухудшать UX в медленных сетях/на слабых устройствах.
- Защита refresh/сессий сильно зависит от корректной синхронизации client channel + origin; при ошибочной клиентской интеграции возможно массовое срабатывание alertness-режимов.
- Rate limit без централизованного стора не защищает от распределенного брутфорса между инстансами.
- SharedWorker-координация refresh работает только в браузерах с поддержкой SharedWorker; fallback есть, но поведение между вкладками становится менее предсказуемым.

## 5) Следующие логические шаги

1. Реализовать собственно мессенджер: комнаты/каналы, сообщения, realtime delivery.
2. Добавить invitation flow (приглашения пользователей) вместо чисто ручного админского создания аккаунтов.
3. Сделать web-admin UI для уже существующих admin endpoint-ов.
4. Довести CAPTCHA до production-состояния (челлендж + серверная валидация).
5. Ввести рабочую систему уведомлений для alertness (`notify_admin` / `notify_user`).
6. Подготовить auth-инфраструктуру к горизонтальному масштабированию (вынести code/rate-limit state в Redis).
7. Вернуться к DPoP (RFC 9449) после стабилизации базового OAuth/session слоя.
