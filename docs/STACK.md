# Стек и архитектура репозитория

Этот документ фиксирует текущий технический стек и архитектурные решения в репозитории `kotel` по факту реализации в коде.

## 1) Структура репозитория

```text
kotel/
├── apps/
│   ├── backend/      — NestJS backend (Node.js)
│   ├── frontend/     — React SPA (Vite)
│   ├── mobile/       — Expo mobile app (React Native)
│   └── prisma/       — общая Prisma-схема, миграции, seed и сгенерированный client
├── docs/             — документация по архитектуре и решениям
├── infra/
│   ├── compose/      — Docker Compose файлы (dev.yml, test.yml)
│   ├── docker/       — Dockerfile по сервисам
│   └── traefik/      — конфигурация Traefik (traefik.yml, dynamic/tls.yml)
├── scripts/          — скрипты управления окружением и тестами
└── .env              — локальные переменные окружения
```

## 2) Стек по приложениям

### Backend (`apps/backend`)

- **Runtime:** Node.js.
- **Framework:** NestJS (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`).
- **Validation/DTO contracts:** Zod (`zod`), без `class-validator` в новых контрактах.
- **ORM/data layer:** Prisma client из `apps/prisma`.
- **Тесты:** Vitest (`vitest`), включая backend unit/integration в тестовых Docker-контейнерах.

### Frontend (`apps/frontend`)

- **Bundler/dev server:** Vite (`vite`).
- **Framework:** React (`react`, `react-dom`).
- **Router:** TanStack Router (`@tanstack/react-router`).
- **State:** Jotai (`jotai`).
- **HTTP:** axios + `axios-auth-refresh`.
- **Data fetching:** TanStack Query (`@tanstack/react-query`).
- **Тесты:** Vitest для unit, Playwright (`@playwright/test`) для E2E.

### Mobile (`apps/mobile`)

- **Framework/runtime:** Expo + Expo Router (`expo`, `expo-router`) на React Native.
- **HTTP:** axios + `axios-auth-refresh`.
- **Token storage:** `expo-secure-store`.
- **OAuth browser/deep links:** `expo-web-browser` + `expo-linking`.
- **Crypto:** `expo-crypto`.
- **State/data:** Jotai + TanStack Query.
- **Тесты:** Vitest (`vitest`) для unit.

### Prisma (`apps/prisma`)

- **Schema layout:** схема разделена по файлам в `apps/prisma/schema/` (`schema.prisma`, `User.prisma`, `Session.prisma`).
- **Migrations:** `apps/prisma/migrations/`.
- **Seed:** `apps/prisma/seed/`.
- **Generated client:** `apps/prisma/client/` (используется из backend через алиас `~prisma/*`).

### Инфраструктура

- **Reverse proxy:** Traefik v3 (`traefik:v3`) с TLS-терминацией и роутингом по hostname/path.
- **Database:** PostgreSQL 18.3 (два изолированных инстанса в dev: `postgres` и `postgres-2`).
- **TLS для dev:** mkcert-сертификаты (`*.localhost`), монтируются в Traefik из локального хранилища.

## 3) TypeScript алиасы

### Backend

- `~prisma/*` → `apps/prisma/*` (через `apps/backend/tsconfig.json`)  
  Используется для импорта Prisma schema/client/types из backend-кода.
- `@contracts/*` → `apps/backend/src/contracts/*` (локальный backend alias)  
  Используется для импортов Zod-контрактов внутри backend.

### Frontend

- `@contracts/*` → `apps/backend/src/contracts/*` (через `apps/frontend/tsconfig.app.json` и `apps/frontend/vite.config.ts`)  
  Позволяет фронтенду импортировать shared Zod-контракты напрямую из backend-контрактов.

### Mobile

- `@/*` → `apps/mobile/*` (через `apps/mobile/tsconfig.json`)  
  Внутренний алиас мобильного приложения для локальных модулей.
- `@contracts/*` → `apps/backend/src/contracts/*` (через `apps/mobile/tsconfig.json` и `apps/mobile/metro.config.js`)  
  Используется для реиспользования контрактов между mobile и backend без дублирования схем.

## 4) Docker Compose: dev topology

Файл: `infra/compose/dev.yml`.

### Сервисы

- `traefik` — reverse proxy, TLS termination, публикация 80/443 + LAN entrypoints 3001/3002.
- `postgres` — PostgreSQL для `backend`.
- `postgres-2` — PostgreSQL для `backend-2`.
- `backend` — NestJS API (подключен к `postgres`).
- `backend-2` — второй NestJS API (подключен к `postgres-2`).
- `frontend` — Vite dev server (SPA для обоих доменов).
- `studio` — Prisma Studio для основной базы (`postgres`).
- `mobile` — Expo dev server (LAN-режим, интерактивный контейнер).

### Роутинг (Traefik labels)

- `Host(kotel1.localhost) && PathPrefix(/api)` → `backend`.
- `Host(kotel2.localhost) && PathPrefix(/api)` → `backend-2`.
- `Host(kotel2.localhost) && PathPrefix(/.well-known)` → `backend-2`.
- `Host(kotel1.localhost) || Host(kotel2.localhost)` (без `/api`) → `frontend`.
- LAN entrypoint `api1` (`:3001`): `PathPrefix(/api)` → `backend`.
- LAN entrypoint `api2` (`:3002`): `PathPrefix(/api)` и `PathPrefix(/.well-known)` → `backend-2`.

## 5) Multi-server архитектура клиента

Один SPA-клиент может держать сессии сразу к нескольким независимым backend-серверам.  
Состояние сессий хранится по ключу server URL (карта вида `Map<serverUrl, ServerSession>` в клиентском сторе).  
Каждый backend работает со своей отдельной Prisma/PostgreSQL базой, серверы между собой не синхронизируют данные.  
Общие Zod-контракты импортируются через `@contracts/*`, что дает единые request/response схемы без runtime-сцепления приложений.  
Детали концепции и потоков: [auth overview](./auth/overview.md) и [auth clients](./auth/clients.md).

## 6) Тестовые окружения

- **Unit/integration:** Vitest. Backend-тесты запускаются в Docker-окружении из `infra/compose/test.yml`. Базовое обязательное окружение для сессий: `TEST_SESSION_COOKIE_DOMAIN`. Также в текущем состоянии test compose еще использует `TEST_IDLE_TIMEOUT` (параметр отмечен как устаревающий и подлежит удалению в отдельном шаге).
- **E2E:** Playwright. Запускается против полного dev-стека (`infra/compose/dev.yml`), тесты находятся в `apps/frontend/e2e/`.
