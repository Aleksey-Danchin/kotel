---
name: IP Traefik Expo LAN
overview: Перевести dev-маршрутизацию под Expo LAN на схему `IP:3001/3002`, добавить SAN для IP в TLS, проверить и актуализировать env-политику и одновременно переименовать сервисы `*2` в формат `*-2`.
todos:
  - id: add-ip-san-cert
    content: Добавить генерацию и подключение TLS сертификата с SAN для HOST_IP без удаления старых cert
    status: completed
  - id: add-traefik-ip-entrypoints
    content: Добавить entrypoints и routers Traefik для IP:3001/IP:3002 с /api и /.well-known для второго backend
    status: completed
  - id: align-env-policy
    content: Проверить и выровнять HOST_IP, EXPO_PUBLIC_API_BASE_URL и cookie-domain переменные под новую LAN политику
    status: completed
  - id: rename-secondary-services
    content: Переименовать backend2/postgres2 в backend-2/postgres-2 с обновлением всех compose ссылок
    status: completed
  - id: docs-and-smoke
    content: Обновить README и выполнить smoke-проверку новых маршрутов и Expo LAN
    status: completed
isProject: false
---

# План перехода на Expo LAN через IP:3001/3002

## Целевая схема

- `https://192.168.31.186:3001/api/*` -> первый backend (эквивалент `kotel.localhost`).
- `https://192.168.31.186:3002/api/*` -> второй backend (эквивалент `katel.localhost`).
- `https://192.168.31.186:3002/.well-known/*` -> второй backend (оставляем, чтобы не ломать discovery/auth-сценарии).

## 1) SSL SAN для IP (без удаления старых сертификатов)

- Обновить [scripts/dev-start.sh](/home/aleksey/Desktop/kotel/scripts/dev-start.sh):
  - добавить генерацию отдельного сертификата для `HOST_IP` через `mkcert` (с проверкой срока действия, как у доменных cert);
  - сохранить существующую генерацию `kotel.localhost` и `katel.localhost` без удаления.
- Обновить [infra/traefik/dynamic/tls.yml](/home/aleksey/Desktop/kotel/infra/traefik/dynamic/tls.yml):
  - добавить новый cert/key для `HOST_IP`-сертификата в список `tls.certificates`.

## 2) Маршрутизация Traefik на порты 3001/3002

- Обновить [infra/traefik/traefik.yml](/home/aleksey/Desktop/kotel/infra/traefik/traefik.yml):
  - добавить entrypoints `api1` (`:3001`) и `api2` (`:3002`) рядом с текущими `web`/`websecure`.
- Обновить [infra/compose/dev.yml](/home/aleksey/Desktop/kotel/infra/compose/dev.yml):
  - у сервиса `traefik` добавить пробросы `3001:3001` и `3002:3002`;
  - у backend-роутеров добавить отдельные routers на новых entrypoints:
    - `api1` -> backend, `PathPrefix('/api')`;
    - `api2` -> backend-2, `PathPrefix('/api')`;
    - `api2` -> backend-2, `PathPrefix('/.well-known')`.
- Существующие host-based роуты (`kotel.localhost`/`katel.localhost` на 443) оставить для обратной совместимости.

## 3) Аудит и фиксация env-политики

- Проверить и синхронизировать [/.env](/home/aleksey/Desktop/kotel/.env), [scripts/dev-start.sh](/home/aleksey/Desktop/kotel/scripts/dev-start.sh), [infra/compose/dev.yml](/home/aleksey/Desktop/kotel/infra/compose/dev.yml):
  - `HOST_IP` — обязательный источник адреса для Expo LAN;
  - `EXPO_PUBLIC_API_BASE_URL` — привести к новой схеме для Expo (`https://${HOST_IP}:3001/api` по умолчанию);
  - `SESSION_COOKIE_DOMAIN` и `SESSION_COOKIE_DOMAIN_2` — оставить доменными (`kotel.localhost`/`katel.localhost`), не переносить в IP, чтобы не ломать cookie-семантику;
  - доменные дефолты оставить в `dev.yml`, а динамический `HOST_IP` — в `.env`/`dev-start.sh`.

## 4) Переименование сервисов `backend2/postgres2` -> `backend-2/postgres-2`

- В [infra/compose/dev.yml](/home/aleksey/Desktop/kotel/infra/compose/dev.yml):
  - переименовать ключи сервисов;
  - обновить `depends_on`, ссылки в `DATABASE_URL` (`@postgres-2`), и зависимости `traefik`.
- Обновить документацию/команды в [README.md](/home/aleksey/Desktop/kotel/README.md) и [apps/mobile/README.md](/home/aleksey/Desktop/kotel/apps/mobile/README.md), где упоминаются `backend2`/`postgres2`.
- Для безопасной миграции сохранить имя существующего тома `postgres2-data`, чтобы не потерять данные второго PostgreSQL.

## 5) Проверка после изменений

- Поднять стек через `scripts/dev-start.sh`.
- Проверить доступность:
  - `https://192.168.31.186:3001/api`;
  - `https://192.168.31.186:3002/api`;
  - `https://192.168.31.186:3002/.well-known/...`.
- Проверить Expo LAN на телефоне с `EXPO_PUBLIC_API_BASE_URL` на `:3001/api`.
- Прогнать точечную проверку линтера по измененным файлам и убедиться, что маршруты на `kotel.localhost/katel.localhost` не регресснули.

