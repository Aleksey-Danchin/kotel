# Q&A Round 1

---

## Q1 — Пункты 2 + 5: Что и где документировать

Сейчас в репозитории ровно один doc-файл — `docs/AUTH_DESIGN.md` (1200 строк, v12). Он покрывает архитектуру авторизации очень подробно. README.md содержит dev-инструкции (как запускать, env-переменные, LAN QR).

Стек технологий нигде явно не перечислен: Vite + React + TanStack Router + Jotai (frontend), NestJS + Prisma + PostgreSQL (backend), Expo Router (mobile), Traefik (infra), Vitest + Playwright (тесты). Также нигде в docs не описаны не-auth архитектурные решения: структура apps-монорепо, маршрутизация, contracts-алиасы, структура стора на Jotai, принцип мультисерверного клиента (как он реализован в коде, а не только концептуально).

Ты говоришь «не больше чем то, что уже есть» — то есть не документировать будущие решения, только текущее.

**Варианты:**
- a) Новый `docs/STACK.md` — перечисляет стек и ключевые архитектурные решения реализации (не auth, уже покрыт), структуру монорепо, алиасы, contracts
- b) Расширить README.md соответствующим разделом (короче, но менее структурировано)
- c) Всё это должно идти в Cursor rules (обсуждается в Q3), а отдельного doc-файла для этого не нужно
- d) Другое: ___

**Ответ:** Новый `docs/STACK.md` — перечисляет стек и ключевые архитектурные решения реализации (не auth, уже покрыт), структуру монорепо, алиасы, contracts.

---

## Q2 — Пункт 3: Что именно изменилось в Expo flow

В последних коммитах (`7b72ccf`, `5cc7ccb`, `bde1d11`) появились два изменения в expo-части:

**Изменение 1** — `apps/mobile/src/api/auth.ts`:
```ts
function toMobileNetworkUrl(serverUrl: string): string {
  const parsed = new URL(serverUrl);
  const isIpv4Host = /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname);
  if (isIpv4Host && parsed.protocol === "https:") {
    parsed.protocol = "http:";
  }
  return parsed.toString().replace(/\/$/, "");
}
```
Эта функция применяется при `exchangeCodeForTokens` и `getSessionStatus` — то есть при каждом API-запросе от мобильного клиента с IPv4-адресом сервера. HTTPS понижается до HTTP. AUTH_DESIGN.md говорит «HTTPS обязателен — это архитектурное требование, не опция».

**Изменение 2** — `apps/mobile/app/auth/callback.tsx`:
Экран-заглушка, который просто редиректит на `/(tabs)/session-test` через 150 мс и ничего не обрабатывает. Вся реальная обработка (code + state + token exchange) происходит внутри `WebBrowser.openAuthSessionAsync` → `addMobileServer` — браузер закрывается, результат возвращается напрямую в функцию.

**Варианты:**
- a) HTTP downgrade — это dev/LAN-only workaround, в продакшне всегда будет hostname, не IPv4 → зафиксировать как явное Known Limitation в AUTH_DESIGN.md (или в `docs/`) + в README как предупреждение
- b) HTTP downgrade — это ожидаемое поведение и для продакшна тоже (например, внутренний IP в локальной сети) → оставить без изменений, просто описать факт в документации
- c) HTTP downgrade нужно вынести за пределы продакшн-кода (отдельный dev-режим / env-флаг) → это шаг рефакторинга, а в docs описать как есть
- d) Callback-экран нужно описать в AUTH_DESIGN.md как деталь реализации Expo flow
- e) Другое: ___

**Ответ:**  HTTP downgrade — это dev/LAN-only workaround, в продакшне всегда будет hostname, не IPv4 → зафиксировать как явное Known Limitation в AUTH_DESIGN.md (или в `docs/`) + в README как предупреждение. Причем обязательно указать, что http это только dev решение, так как нет возможности настроить dns для работы с локальными domain. Возможно в будущем эта проблема будет решена.

---

## Q3 — Пункт 4: Граница docs vs rules

Сейчас:
- `docs/AUTH_DESIGN.md` — подробная narrative-документация архитектуры auth (1200 строк)
- `.cursor/rules/testing.mdc` — правило для AI агентов, `alwaysApply: true`, покрывает тестовый стек и DTO-политику

Cursor rules поддерживают два механизма применения:
- `alwaysApply: true` — подтягивается в контекст агента при любой задаче
- `globs: ["apps/backend/**"]` — подтягивается только когда агент работает с файлами, соответствующими паттерну

Вопрос в том, что должно быть docs (читают люди + иногда AI), а что rules (читает только AI, применяется при работе с кодом).

**Варианты:**
- a) Docs = narrative для людей (как AUTH_DESIGN.md), rules = лаконичные constraints для AI (как testing.mdc). Ключевые ограничения из docs частично дублируются в rules в краткой форме. AUTH_DESIGN.md остаётся в `docs/`.
- b) AUTH_DESIGN.md переносится в `.cursor/rules/` (или `@docs` директиву) — тогда AI всегда видит архитектуру, люди тоже могут читать. Отдельной `docs/` папки нет.
- c) Rules только для «как работать с этим кодом» (constraints, стек, тест-политика), docs только для «что это за система и почему так» (концепция, архитектура). Они не пересекаются.
- d) Другое: ___

**Ответ:** Docs = narrative для людей (как AUTH_DESIGN.md), rules = лаконичные constraints для AI (как testing.mdc). Ключевые ограничения из docs частично дублируются в rules в краткой форме. AUTH_DESIGN.md остаётся в `docs/`. Включить в rules инстуркцию по поиску полного текста документации в соответствующих docs файлах.

---

## Q4 — Пункт 7: Покрытие тестами — пробелы

Я нашёл все тест-файлы. Вот что есть и чего нет:

**Есть тесты:**
- Backend: `auth.service.spec.ts`, `auth.controller.spec.ts`, `code-store.spec.ts`, `rate-limiter.spec.ts`, `alertness.spec.ts`, `session.guard.spec.ts`, `session.guard.integration.spec.ts`, `session.service.spec.ts`, `session.controller.integration.spec.ts`, `session.module.spec.ts`, `setup.service.spec.ts`, `setup.controller.integration.spec.ts`, `admin.service.spec.ts`, `admin.controller.integration.spec.ts`, `roles.guard.spec.ts`, `token-cookie.constants.spec.ts`, `token.utils.spec.ts`, `contracts.schemas.spec.ts`
- Frontend unit: `api/auth.test.ts`, `state/servers.test.ts`, `components/sidebar.test.tsx`
- Frontend E2E (Playwright): `e2e/auth/oauth-flow.spec.ts`, `e2e/auth/session-lifecycle.spec.ts`, `e2e/auth/setup-flow.spec.ts`
- Mobile unit: `src/api/auth.test.ts`, `src/api/create-server-client.test.ts`, `src/api/secure-store.test.ts`, `src/api/session.test.ts`

**Нет тестов:**
- `apps/frontend/src/workers/shared-refresh-worker.ts` — SharedWorker, нет ни одного тест-файла рядом
- `apps/frontend/src/queryOptions/` — нет тестов (можно считать UI-обёрткой, не критично)
- `apps/mobile/src/state/servers.ts` — нет тестов на mobile-стор (есть на frontend-стор)

Вопрос: нужно ли добавлять тесты для SharedWorker и mobile-стора как отдельные шаги?

**Варианты:**
- a) Да, SharedWorker нужно покрыть unit-тестами (Vitest) — это бизнес-логика, не просто UI-склейка
- b) SharedWorker тестировать пока не нужно — его покрывает E2E тест session-lifecycle (косвенно через браузер)
- c) Mobile-стор нужно покрыть unit-тестами — аналогично frontend-стору
- d) Всё вышеперечисленное добавить
- e) Ничего из этого не нужно — текущее покрытие достаточно
- f) Другое: ___

**Ответ:** Да, SharedWorker нужно покрыть unit-тестами (Vitest) — это бизнес-логика, не просто UI-склейка. Mobile-стор нужно покрыть unit-тестами — аналогично frontend-стору

---

## Q5 — Пункт 8: Скопированные rules под часть кодовой базы

Сейчас единственное правило — `testing.mdc` с `alwaysApply: true`. Оно подтягивается агенту при любой задаче.

Cursor rules поддерживают `globs` — тогда правило подтягивается только когда агент открывает/редактирует файлы, соответствующие паттерну. Например:
```
globs: ["apps/backend/**"]
```

Вопрос: для каких областей кодовой базы нужны отдельные scoped rules?

Возможные области:
- `apps/backend/**` — NestJS-специфика, Prisma-паттерны, Zod-контракты
- `apps/frontend/**` — React/TanStack/Jotai паттерны, SharedWorker, axios-auth-refresh
- `apps/mobile/**` — Expo-специфика, SecureStore, WebBrowser, Deep Links
- `infra/**` — Traefik, docker-compose паттерны
- `apps/backend/src/contracts/**` — правила контрактов

**Варианты:**
- a) Создать rules для каждой области (backend, frontend, mobile, infra/contracts) — по одному файлу на область
- b) Создать только для backend и frontend (самые объёмные) — мобильный пока маленький
- c) Создать один общий архитектурный rule (`alwaysApply: true`) + оставить testing.mdc как есть
- d) Другое: ___

**Ответ:** Создать rules для каждой области (backend, frontend, mobile, infra/contracts) — по одному файлу на область. Вообще мне нравится идея "маленьких" и "точеычных" rules и docs. Я даже подумываю можно ли как-то логично разбить AUTH_DESIGN.md.

---

## Q6 — Пункт 9: Документ пользовательских сценариев

Ты хочешь добавить в docs «пользовательские сценарии использования с шагами», а в тестах — ссылки на конкретный файл и номер шага.

Сейчас в AUTH_DESIGN.md уже есть раздел «Сценарии» (13 пунктов), но они архитектурные, не user-facing. В `apps/mobile/README.md` есть Manual Checklist с numbered steps, но только для мобильного.

**Варианты по месту:**
- a) Новый `docs/USER_SCENARIOS.md` — пользовательские сценарии, от имени пользователя (Алиса делает X → видит Y)
- b) Расширить `docs/AUTH_DESIGN.md` — добавить пользовательские сценарии как отдельный раздел
- c) Отдельные файлы по клиентам: `docs/scenarios/web.md`, `docs/scenarios/mobile.md`
- d) Другое: ___

**Варианты по формату ссылок в тестах:**
- e) Комментарий в коде теста: `// → docs/USER_SCENARIOS.md scenario-1 step-3`
- f) В describe/it строке: `it("scenario-1 step-3: пользователь открывает логин")`
- g) В отдельном JSDoc-комментарии над тестом
- h) Другое: ___

**Ответ:** Отдельные файлы: `docs/scenarios/<type>/<NNN-name>.md`. type  варианты front auth, front reg, expo auth, expo reg и тд. Т.е. это сценарии именно что пользовательские, фактические сценарии тестирования backend будут замодокументированны в тестах. ХОтя именно этот пункт готов обсудить подробнее. Важный пункт.

---

## Q7 — Пункт 10: Оценка текущего состояния проекта

Ты хочешь оценку текущего состояния. Я могу подготовить структурированный документ.

**Варианты по охвату оценки:**
- a) Только техническое: покрытие тестами, открытые architectural risks, известные TODO/известные ограничения
- b) Продуктовое + техническое: что реализовано, что не реализовано, следующие логические шаги
- c) Полный аудит: код, тесты, документация, архитектура, инфраструктура, безопасность
- d) Другое: ___

**Варианты по формату и месту:**
- e) Новый `docs/PROJECT_STATUS.md` — живой документ, обновляется по мере развития
- f) Раздел в README.md
- g) Не документ, а набор GitHub Issues / task-списков
- h) Другое: ___

**Ответ:** Полный аудит: код, тесты, документация, архитектура, инфраструктура, безопасность.

---

## Q8 — Архитектурный вопрос: HTTP downgrade в мобильном клиенте (детализация Q2)

Уточняю: `toMobileNetworkUrl` применяется в `apps/mobile/src/api/auth.ts` при **каждом** вызове к серверу (`exchangeCodeForTokens`, `getSessionStatus`), а не только при авторизации. Функция также используется в `apps/mobile/src/api/create-server-client.ts` (per-server axios instance) — то есть **все** API-запросы от мобильного клиента к IPv4-хосту идут по HTTP.

AUTH_DESIGN.md раздел «Хранение токенов»:
> HTTPS обязателен — SameSite=None; Secure cookie не работает на HTTP.

Но мобильный клиент использует `Authorization: Bearer` (не cookie) — поэтому HTTPS не является строгим требованием для expo с точки зрения cookie. Однако токены в `Authorization: Bearer` по HTTP — это всё равно уязвимость (токены в открытом виде в сети).

Вопрос: это осознанная dev-only конфигурация или постоянное поведение мобильного клиента?

**Варианты:**
- a) Осознанно только для dev/LAN — стоит защитить env-флагом или проверкой `__DEV__` чтобы в продакшн не попало
- b) Осознанно для любого использования с IP-адресом — по умолчанию в такой сети HTTPS всё равно недоступен, это приемлемо
- c) Нужно зафиксировать как Known Limitation, но код трогать не надо
- d) Другое: ___

**Ответ:** Осознанно только для dev/LAN — стоит защитить env-флагом или проверкой `__DEV__` чтобы в продакшн не попало. Может быть даже сделать http только для нескольких endpoint где это нужно, а для всех остальных https. Тоже нужно обсудить, не уверен как будут вести себя запросы expo к https.

---

## Q9 — Пункт 6: Архитектурные сомнения для обсуждения

Ты упомянул что готов к раундам опросов насчёт того что уже есть в документации и коде, если это вызывает архитектурные сомнения.

Я нашёл одно несоответствие (Q8). Есть ещё несколько мест которые могут вызывать вопросы:

1. **Fingerprint в реализации** — в AUTH_DESIGN.md fingerprint описан как `redirect_uri` (адрес клиента). В коде поле называется `fingerprint` в БД-записи сессии и проставляется из `redirect_uri`. Это совпадает. Но логика проверки fingerprint при каждом запросе — есть ли она в коде?

2. **Channel delivery check** — AUTH_DESIGN.md описывает: web-сессия ожидает токен в Cookie, expo-сессия — в Bearer. Аномалия → режим настороженности. Это реализовано?

3. **IDLE_TIMEOUT** — есть env-переменная `IDLE_TIMEOUT`. В AUTH_DESIGN.md нет упоминания о idle timeout. Это дополнение к архитектуре?

Хочешь ли ты чтобы я вынес эти вопросы в отдельный раунд или можем обсудить сейчас?

**Варианты:**
- a) Да, хочу обсудить архитектурные несоответствия — вынеси их в отдельные вопросы этого файла
- b) Нет, пока хватит — сначала ответим на Q1-Q8, потом посмотрим
- c) Другое: ___

**Ответ:** а, хочу обсудить архитектурные несоответствия — вынеси их в отдельные вопросы этого файла.

---

# Q&A Round 2

---

## Q10 — Q5 follow-up: Разбиение AUTH_DESIGN.md

Ты упомянул что «подумываешь разбить AUTH_DESIGN.md». Это важное структурное решение, которое влияет на несколько шагов.

Сейчас AUTH_DESIGN.md = 1200 строк, один файл. Естественные смысловые блоки внутри:
1. OAuth 2.0 flow + PKCE + Deep Links (авторизация)
2. Токены — схема, хранение, TTL, хэширование
3. Сессии — БД-схема, статусы, ротация, Reuse Detection
4. Безопасность — fingerprint, канал доставки, режимы настороженности
5. Rate limiting
6. Клиентская часть — web (SharedWorker, popup), Expo (SecureStore, WebBrowser)
7. Implementation Decisions — конкретные технические решения

**Варианты:**
- a) Разбить на отдельные файлы по блокам (например, `docs/auth/oauth-flow.md`, `docs/auth/tokens.md`, `docs/auth/sessions.md`) — мелко и точечно
- b) Разбить на 2-3 крупных файла: `docs/AUTH_OVERVIEW.md` (концепция + flow), `docs/AUTH_IMPLEMENTATION.md` (детали реализации + impl decisions), `docs/AUTH_SECURITY.md` (rate limit, fingerprint, alertness)
- c) Оставить один файл, но добавить оглавление и улучшить навигацию — слишком большой чтобы разбивать без веской причины
- d) Разбить AUTH_DESIGN.md на части И вынести Implementation Decisions в отдельный файл, остальное по-прежнему вместе
- e) Другое: ___

**Ответ:** Разбить на отдельные файлы по блокам (например, `docs/auth/oauth-flow.md`, `docs/auth/tokens.md`, `docs/auth/sessions.md`) — мелко и точечно. Возможно сделать перекрестный отсылки.

---

## Q11 — Q6 follow-up: Сценарии — детали структуры и cross-reference

Ты ответил: `docs/scenarios/<type>/<NNN-name>.md` и готов обсудить подробнее.

**Уточняю scope сценариев:**

Что сейчас есть в системе (текущая реализация):
- Web: добавить сервер (OAuth + popup), session-test страница (проверить/logout/logout-all), setup-страница (init root)
- Expo: добавить сервер (OAuth + WebBrowser), session-test tab (signin/check/signout)
- Shared backend: refresh rotation, reuse detection, rate limiting

**Вопрос А — scope первых сценариев (только то что уже реализовано):**
- a) Только пользовательские сценарии по Web клиенту (добавить сервер, session-test, setup)
- b) Web + Expo (всё что уже реализовано и работает)
- c) Web + Expo + admin-сценарии (revoke sessions, список пользователей, создание пользователя) — они тоже реализованы
- d) Другое: ___

**Вопрос Б — формат cross-reference в автоматических тестах:**

Варианты как ссылаться из тест-файла на конкретный шаг сценария:
- e) Комментарий перед `it()`: `// docs/scenarios/web-auth/001-add-server.md step-3`
- f) Часть строки `it()`: `it("[001-add-server step-3] callback closes popup and resolves session")`
- g) Отдельный JSDoc `/** @scenario 001-add-server step-3 */` перед `it()`
- h) Другое: ___

**Вопрос В — manual-тесты (Expo, mobile README):**
- i) Ссылки из `apps/mobile/README.md` checklist → `docs/scenarios/expo-auth/*.md` 
- j) Мобильный README — отдельная история, сценарии и checklist не связывать
- k) Другое: ___

**Ответ:** так, ладно. Давай опишем только те сценарии, для которых уже есть тесты пользовательских сценариев. Если нет таких тестов, то тогда и файлы сценариев не нужно. Я понял, что для полноценных пользовательских сценариев нехватает функционала. Прямо сейчас на ум приходит только авторизация и выход, и создание перового пользователя.

---

## Q12 — Пункт 7 follow-up: Формат и место PROJECT_STATUS

В Q7 ты ответил «полный аудит». Уточняю место и формат.

**Варианты:**
- a) Новый `docs/PROJECT_STATUS.md` — живой документ, разделы: "Что реализовано", "Тестовое покрытие", "Открытые риски", "Следующие шаги"
- b) Раздел в существующем README.md
- c) `docs/AUDIT.md` — разовый срез состояния, не предполагает обновлений
- d) Другое: ___

**Ответ:** docs/ROAD_MAP.md

---

## Q13 — Архитектурное несоответствие: channel delivery check

Я нашёл отличие между AUTH_DESIGN.md и реализацией.

**AUTH_DESIGN.md говорит:**
> web сессия: если пришёл токен в Authorization: Bearer → аномалия → режим настороженности  
> expo сессия: если пришёл в Cookie → аномалия → режим настороженности

**Что в коде:**

В `session.guard.ts`, метод `verifyClientType`:
```ts
private verifyClientType(source: Source, clientType: 'WEB' | 'EXPO'): void {
  if (clientType === 'WEB' && source !== 'cookie') {
    throw new UnauthorizedException();  // ← отклоняет немедленно
  }
  if (clientType === 'EXPO' && source !== 'bearer') {
    throw new UnauthorizedException();  // ← отклоняет немедленно
  }
}
```

То же самое в `session.service.ts` при refresh. Alertness mode (режим настороженности) здесь не задействован — он используется только в `handleReuseDetection` при refresh token reuse.

Аналогично для `verifyOrigin` — код отклоняет (ForbiddenException), а не переводит сессию в alertness mode.

**Варианты:**
- a) Документ неверен — обновить AUTH_DESIGN.md: описать что channel mismatch → немедленный `401`, а не режим настороженности
- b) Код неверен — нужно добавить triggering alertness mode при channel mismatch (как описано в документе)
- c) Частично верны оба: channel mismatch → reject (текущий код) + логировать инцидент (добавить) + не трогать alertness (слишком жёстко для channel аномалии)
- d) Другое: ___

**Ответ:** Код неверен — нужно добавить triggering alertness mode при channel mismatch (как описано в документе). Стоит исправить прямо сейчас.

---

## Q14 — Архитектурное несоответствие: IDLE_TIMEOUT не реализован

`IDLE_TIMEOUT` присутствует в `.env`, `infra/compose/dev.yml`, `infra/compose/test.yml`, README.md (описан как «обязательный»). Но в backend source code он нигде не читается (`grep` по всем `.ts` файлам дал 0 результатов).

Из архива (`/.dev/archive/002-session-resource/`) видно, что IDLE_TIMEOUT планировался как порог неактивности сессии. В текущей реализации cleanup sessions использует только `refreshTokenExpiresAt`, а не idle timeout.

**Варианты:**
- a) IDLE_TIMEOUT — запланированная, но не реализованная фича. Нужно реализовать (отдельный шаг): логику чтения IDLE_TIMEOUT и пометки idle-сессий как expired
- b) IDLE_TIMEOUT намеренно не реализован сейчас. Убрать его из README как «обязательного», но оставить в env на будущее
- c) IDLE_TIMEOUT больше не нужен — удалить из env, compose и README полностью
- d) Другое: ___

**Ответ:** IDLE_TIMEOUT больше не нужен — удалить из env, compose и README полностью

---

## Q15 — Q8 follow-up: HTTP downgrade — как именно защитить

Ты ответил: `__DEV__` или env-флаг, и возможно ограничить только нужные endpoints.

Разберём детально. В коде HTTP downgrade используется в двух местах:
1. `apps/mobile/src/api/auth.ts` — `exchangeCodeForTokens` и `getSessionStatus` (разовые вызовы при авторизации)
2. `apps/mobile/src/api/create-server-client.ts` — `getServerClient` устанавливает `baseURL = toMobileNetworkUrl(serverUrl)` — то есть **все** последующие API-запросы через axios идут по HTTP если serverUrl содержит IPv4

В Expo `__DEV__` — стандартный глобальный флаг (true в dev сборке, false в production). Он уже доступен без доп. конфига.

**Варианты:**
- a) Обернуть `toMobileNetworkUrl` в проверку `__DEV__`: если не DEV — всегда возвращать URL без изменений
- b) Вынести отдельный env-флаг `EXPO_PUBLIC_ALLOW_HTTP_FALLBACK=true` — явное оптин только для dev
- c) Убрать `toMobileNetworkUrl` совсем и решить LAN-проблему иначе (например, установить mkcert CA на устройство)
- d) Оставить как есть, просто задокументировать
- e) Другое: ___

**Ответ:** Оставить как есть, просто задокументировать. В dev режиме http, а иначе https.

---

# Q&A Round 3

---

## Q16 — Q13 follow-up: Что происходит с запросом при channel mismatch + alertness

Ты сказал: код нужно исправить — добавить triggering alertness mode при channel mismatch. Нужно уточнить два момента чтобы правильно написать спецификацию.

**Момент 1 — исход текущего запроса:**

При Reuse Detection текущая операция (refresh) полностью отклоняется: alertness mode отрабатывает (изоляция/карантин/локдаун) + `401`. Аналогично для channel mismatch?

- a) Да: channel mismatch → alertness mode отрабатывает (revoke chain / all sessions / lockdown по конфигу) + запрос отклоняется с `401`
- b) Мягче: channel mismatch → только логируем + флажок на сессии «подозрительная» + `401`, без немедленного отзыва сессии
- c) Другое: ___

**Момент 2 — где именно проверять:**

Channel mismatch случается в двух точках:
1. `session.guard.ts` → каждый запрос к защищённым endpoint-ам
2. `session.service.ts` → при refresh

- d) Фиксить в обоих местах одинаково
- e) Только при refresh (там он наиболее критичен)
- f) Другое: ___

**Ответ:** a + d

---

## Q17 — Q11 follow-up: Формат ссылки из теста на сценарий

В Q11 ты ответил по scope, но не выбрал формат cross-reference (вопрос Б) и не ответил по mobile README (вопрос В).

Для web E2E тестов — как ссылаться на шаг сценария из `it()` блока?

- a) Комментарий перед `it()`: `// docs/scenarios/web-auth/001-add-server.md step-3`
- b) Часть строки `it()`: `it("[001 step-3] callback closes popup and resolves session")`
- c) Нет ссылок из тестов — сценарии и тесты связаны только структурно (одни и те же слова в описаниях), без явных ссылок в коде
- d) Другое: ___

Mobile README — нужно ли обновлять `apps/mobile/README.md` чтобы его checklist ссылался на будущие scenario-файлы?
- e) Да, обновить README — добавить ссылки на docs/scenarios/expo-*
- f) Нет, mobile README пока не трогать
- g) Другое: ___

**Ответ:** a + f

