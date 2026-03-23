# Auth Design

> Документ сгенерирован в результате обсуждения с LLM моделью **Claude Sonnet 4.6** (Anthropic). Версия v12.

## О документе

**Что обсуждается:**

- Архитектура авторизации — OAuth 2.0 flow, PKCE, обмен кодами и рукопожатия
- Модель токенов — accessToken, refreshToken, схема хранения, rotation, reuse detection
- Схема БД — таблицы, поля, индексы, хэширование
- Алгоритмы безопасности — fingerprint, режимы настороженности, rate limiting
- Поведение клиентов — web и Expo, хранение токенов, silent refresh, logout
- Конфигурация сервера — параметры безопасности и их влияние на поведение

**Что намеренно не обсуждается:**

- Выбор стека технологий и его мотивация
- Методология разработки
- UI/UX решения и дизайн интерфейса
- Инфраструктура и DevOps помимо базового docker-compose
- Функциональность мессенджера — чаты, сообщения, уведомления, медиа

Документ описывает **что** и **почему** на уровне архитектурных решений. **Как именно реализовать** — отдельный этап.

## Сценарии

Ключевые сценарии, которые охватывает архитектура. Каждый пункт сопровождён ссылкой на раздел с деталями реализации.

1. 🔐 Первый вход — Алиса авторизуется на сервере через OAuth + PKCE → [Авторизация — OAuth 2.0](#авторизация--oauth-20), [PKCE (RFC 7636)](#pkce-rfc-7636--обязателен-для-web-и-mobile)
2. 🔄 Тихий refresh — accessToken истёк, клиент обновляет его незаметно для Алисы → [Refresh — реактивная модель (401-interceptor)](#refresh--реактивная-модель-401-interceptor)
3. 🚪 Logout — выход с одного устройства и выход со всех устройств → [Logout](#logout)
4. 🌐 Несколько серверов одновременно — Алиса держит сессии на serverA и serverB параллельно → [Концепция](#концепция), [Структура стора клиента](#структура-стора-клиента)
5. 📱 Мобильная авторизация — тот же flow, но через системный браузер и Deep Link → [Авторизация на мобильном — Deep Links](#авторизация-на-мобильном--deep-links), [Expo (mobile)](#expo-mobile)
6. 🗂️ Refresh Token Rotation — как цепочка ротации выглядит в БД со временем → [Refresh Token Rotation с Reuse Detection](#refresh-token-rotation-с-reuse-detection), [Схема БД](#схема-бд)
7. 🖥️ Несколько вкладок браузера — SharedWorker координирует refresh между вкладками → [Edge case — несколько вкладок браузера (web)](#edge-case--несколько-вкладок-браузера-web)
8. 🚨 Reuse Detection — украденный refreshToken, система обнаруживает атаку → [Refresh Token Rotation с Reuse Detection](#refresh-token-rotation-с-reuse-detection)
9. 💥 Режимы настороженности — что происходит в Изоляции, Карантине, Локдауне → [Режим настороженности](#режим-настороженности)
10. 🎭 PKCE против перехвата code — злоумышленник перехватил code, но не может им воспользоваться → [PKCE (RFC 7636)](#pkce-rfc-7636--обязателен-для-web-и-mobile)
11. 🌀 Перехват Deep Link на Android — почему это только DoS, а не компрометация → [Авторизация на мобильном — Deep Links](#авторизация-на-мобильном--deep-links), [Известные ограничения](#известные-ограничения)
12. 🔌 Сеть упала во время logout — retry-очередь и её ограничения → [Logout](#logout), [Известные ограничения](#известные-ограничения)
13. 👨‍💼 Администратор принудительно отзывает сессии → [Logout](#logout), [Режим настороженности](#режим-настороженности)

---

## Концепция

Self-hosted мессенджер с закрытой регистрацией. Каждый сервер — изолированное сообщество, доступ только по приглашению от администратора. Серверы не знают друг о друге и не обмениваются данными.

Мультисерверность реализована на уровне клиента: один клиент держит независимые сессии к нескольким серверам одновременно. Клиент — это менеджер сессий, сервер — простой изолированный бэкенд.

Это принципиальное отличие от Matrix/Element, где серверы федерированы между собой. Здесь только клиент знает обо всех серверах.

---

## Серверная часть

- Каждый сервер — независимый Authorization Server по OAuth 2.0
- Серверы не общаются между собой
- Регистрация только через администратора, открытой регистрации нет
- HTTPS обязателен — HTTP не принимается. Это архитектурное требование, не опция
- CORS: `Access-Control-Allow-Origin: <reflect Origin>` для всех маршрутов — безопасно, авторизация через httpOnly cookie, не через Bearer. `Access-Control-Allow-Origin: *` несовместим с `credentials: include`.

```yaml
# Минимальный конфиг сервера
server:
  https: required       # HTTP отклоняется или редиректит на HTTPS

cors:
  allow_origins: reflect  # отражаем Origin из запроса для всех маршрутов

auth:
  type: oauth2
  accessTokenTtl: 15m
  refreshTokenTtl: 30d
```

---

## Авторизация — OAuth 2.0

Клиент никогда не видит пароль пользователя. Пароль вводится только на странице самого сервера.

**Flow авторизации:**

```
1. Пользователь вводит в клиенте URL сервера
2. Клиент генерирует PKCE пару и state, открывает popup
3. Пользователь вводит логин/пароль на странице serverA.com
4. serverA редиректит popup обратно на клиент с code
5. Callback страница клиента передаёт code через postMessage
6. Клиент проверяет state, обменивает code на токены
7. Сервер устанавливает токены в httpOnly cookie
```

**Пример открытия popup с PKCE + state:**

```javascript
// Генерируем PKCE и state
const bytes = crypto.getRandomValues(new Uint8Array(64))
const codeVerifier = btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=/g, "")
const codeChallenge = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
  .then(buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""))

const state = crypto.randomUUID()
sessionStorage.setItem(`oauth_state_${serverUrl}`, state)

const params = new URLSearchParams({
  redirect_uri: clientCallbackUrl,
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
  state: state
})

const popup = window.open(
  `${serverUrl}/api/auth/login?${params}`,
  "auth",
  "width=500,height=600"
)

// Получение code после авторизации
window.addEventListener("message", (event) => {
  // Проверяем что сообщение от нашей же страницы (callback редиректит popup на наш домен)
  if (event.origin !== window.location.origin) return

  // Проверяем state — защита от CSRF и подмены flow
  const savedState = sessionStorage.getItem(`oauth_state_${serverUrl}`)
  if (event.data.state !== savedState) return
  sessionStorage.removeItem(`oauth_state_${serverUrl}`)

  // Обмениваем code на токены
  exchangeCode(serverUrl, event.data.code, codeVerifier)
})
```

**Callback страница клиента** (`clientApp.com/callback`):

```javascript
// Popup оказывается на нашем домене после редиректа от сервера
const { code, state } = new URLSearchParams(window.location.search)
window.opener.postMessage({ code, state }, window.location.origin)
window.close()
```

### Почему это безопасно

- Злой форкнутый клиент может получить токен, но не пароль
- Токен привязан к одному серверу и может быть отозван администратором
- Пользователь видит адресную строку браузера в popup — визуальный сигнал доверия

### Открытый redirect_uri — осознанное решение

В стандартном OAuth 2.0 клиент должен быть заранее зарегистрирован на сервере — `redirect_uri` вносится в белый список. Это защищает от того чтобы любой сайт не мог использовать сервер как OAuth провайдер.

Здесь сервер принимает любой `redirect_uri` без предварительной регистрации клиента. Это осознанное решение, обоснованное моделью угроз:

Открытый `redirect_uri` опасен когда регистрация пользователей публичная — атакующий создаёт аккаунт и манипулирует flow. В данной архитектуре пользователей добавляет только администратор. Любой сайт может инициировать OAuth flow, но получит токен только если существующий пользователь сам введёт свои данные на странице сервера.

Единственный остающийся риск — социальная инженерия: злой клиент убеждает пользователя авторизоваться через него. Это фишинг — человеческий фактор, не архитектурная уязвимость.

> Динамическая регистрация клиентов (RFC 7591) в данной архитектуре избыточна. Закрытая регистрация пользователей является достаточным контролем. Security решения должны соответствовать модели угроз, а не применяться по умолчанию.

### PKCE (RFC 7636) — обязателен для web и mobile

В JS коде и в мобильном приложении невозможно безопасно хранить `client_secret` — код можно прочитать или декомпилировать. PKCE решает это без необходимости в секрете.

Название буквально описывает механизм: **Proof Key for Code Exchange** — ключ-доказательство для обмена кода. Клиент сам генерирует себе одноразовое доказательство своей идентичности прямо в момент flow. Никакой инфраструктуры, никаких секретов которые нужно хранить заранее.

**Два канала передачи**

```
Канал 1 — начало flow (через URL, открыто):
  webClientB → serverA: codeChallenge = SHA256(codeVerifier)

Канал 2 — обмен code на токены (через fetch body, закрыто):
  webClientB → serverA: codeVerifier (сырая строка)
```

Доказательство что оба запроса от одного источника — `SHA256(codeVerifier) == codeChallenge`. Знает прообраз хэша только тот кто его сгенерировал.

**Полный flow на примере webClientB → serverA**

```
Шаг 1 — webClientB генерирует PKCE пару и state локально в браузере:
  codeVerifier  = "xK9mP2qL..."  — остаётся в памяти webClientB
  codeChallenge = SHA256(codeVerifier) = "hJ7nQ4..."
  state         = "rT5uV8..."    — случайный nonce, сохраняется в sessionStorage

Шаг 2 — webClientB открывает popup на serverA:
  GET serverA.com/api/auth/login
    ?redirect_uri=webClientB.com/callback
    &code_challenge=hJ7nQ4...
    &code_challenge_method=S256
    &state=rT5uV8...

  serverA сохраняет: { codeChallenge: "hJ7nQ4...", redirect_uri: "webClientB.com/callback", state: "rT5uV8..." }

Шаг 3 — Пользователь вводит логин/пароль на странице serverA
  webClientB не видит что вводится

Шаг 4 — serverA генерирует одноразовый code и редиректит:
  code = "aB3cD5..."  — случайная строка, живёт 30-60 секунд
  serverA сохраняет: { code: "aB3cD5...", codeChallenge: "hJ7nQ4...", userId: 123 }
  редирект → webClientB.com/callback?code=aB3cD5...&state=rT5uV8...

  code виден в адресной строке — это нормально, сам по себе он бесполезен

Шаг 5 — callback страница webClientB передаёт code в основное окно:
  window.opener.postMessage({ code: "aB3cD5...", state: "rT5uV8..." }, window.location.origin)

Шаг 6 — основное окно проверяет state и обменивает code на токены:
  savedState = sessionStorage.getItem("oauth_state_serverA")
  "rT5uV8..." == "rT5uV8..."  ✓  — flow не подменён
  sessionStorage.removeItem("oauth_state_serverA")

  POST serverA.com/api/auth/token
    { code: "aB3cD5...", codeVerifier: "xK9mP2qL...", clientType: "web" }

Шаг 7 — serverA проверяет PKCE:
  SHA256("xK9mP2qL...") = "hJ7nQ4..."
  "hJ7nQ4..." == "hJ7nQ4..."  ✓
  code существует и не истёк  ✓
  code инвалидируется — больше использовать нельзя

Шаг 8 — serverA выдаёт токены (см. раздел Токены)
```

**Что происходит если злой клиент перехватил code**

```
Злой клиент пробует:
  POST serverA.com/api/auth/token
    { code: "aB3cD5...", codeVerifier: "???" }

serverA: SHA256("???") = "xYz..." != "hJ7nQ4..."  ✗ → 400
```

`codeVerifier` никогда не покидал память webClientB — без него code мёртвый.

**Роль serverB во всём этом**

Никакая. serverB вообще не участвует в авторизации на serverA и не знает что это произошло. Изоляция полная.

**SHA256 — криптографически стойкая хэш функция**

Три ключевых свойства:

Необратимость — зная `codeChallenge = SHA256(codeVerifier)` невозможно вычислить `codeVerifier` обратно. Только перебором — SHA256 даёт 2²⁵⁶ возможных значений, для перебора потребовалось бы больше энергии чем существует во вселенной.

Детерминированность — один и тот же `codeVerifier` всегда даёт один и тот же `codeChallenge`. Поэтому serverA может проверить совпадение.

Устойчивость к коллизиям — невозможно подобрать другую строку `X` такую что `SHA256(X) == SHA256(codeVerifier)`. Нельзя подделать `codeVerifier` зная только `codeChallenge`.

MD5 и SHA1 считаются сломанными — для них найдены практические коллизии. SHA256 практических уязвимостей не имеет. Именно поэтому RFC 7636 требует минимум SHA256.

**Генерация codeVerifier — важный нюанс**

`codeVerifier` должен быть минимум 43 символа и генерироваться через криптографически стойкий генератор случайных чисел. `Math.random()` предсказуем — не использовать.

RFC 7636 рекомендует `crypto.getRandomValues()` + base64url — максимальное символьное пространство `[A-Za-z0-9-._~]`. `randomUUID()` использует только `[0-9a-f-]` — меньшая энтропия на символ.

```javascript
// Web — правильно, по RFC 7636
function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}
const codeVerifier = generateCodeVerifier()  // 86 символов base64url

// Expo — правильно, по RFC 7636
import * as Crypto from "expo-crypto"
const bytes = Crypto.getRandomBytes(64)
const codeVerifier = btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=/g, "")

// Никогда не делать так
const codeVerifier = Math.random().toString()           // предсказуем ✗
const codeVerifier = crypto.randomUUID() + randomUUID() // меньшая энтропия ✗
```

**Правило — PKCE + state обязательны на обоих клиентах**

```
PKCE:  клиент доказывает серверу  — "этот code запросил я"
       защита от перехвата code снаружи

state: клиент доказывает себе    — "этот code я сам запрашивал"
       защита от подброса чужого code снаружи (login CSRF)
```

Два зеркальных механизма — два разных вектора атаки. Использовать оба всегда, на web и Expo.

### Авторизация на мобильном — Deep Links

На мобильном нет домена и нет popup. Приложение регистрирует свою URL схему на уровне ОС:

```
kotel://auth/callback
```

Когда сервер редиректит на `kotel://auth/callback?code=...` — ОС перехватывает URL и открывает приложение. В Expo это реализуется через `expo-linking`.

Страница авторизации открывается через системный браузер (`expo-web-browser`) — не через встроенный WebView. Пользователь видит адресную строку и домен сервера. Это принципиально для безопасности — WebView адресной строки не показывает.

```javascript
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import * as Crypto from "expo-crypto"

async function loginToServer(serverUrl) {
  // Генерируем PKCE — правильно, по RFC 7636
  const bytes = Crypto.getRandomBytes(64)
  const codeVerifier = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  const codeChallenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64URL }
  )

  // Генерируем state — живёт в памяти, функция не вернётся пока браузер открыт
  // openAuthSessionAsync блокирует выполнение — переменная гарантированно жива
  const state = Crypto.randomUUID()

  const redirectUri = Linking.createURL("auth/callback")

  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: state
  })

  const result = await WebBrowser.openAuthSessionAsync(
    `${serverUrl}/api/auth/login?${params}`,
    redirectUri
  )

  if (result.type === "success") {
    const { code, state: returnedState } = Linking.parse(result.url).queryParams

    // Проверяем state — защита от login CSRF
    // Подброшенный code будет содержать чужой state — не совпадёт
    if (returnedState !== state) {
      throw new Error("OAuth state mismatch — возможна атака подмены flow")
    }

    const tokens = await exchangeCode(serverUrl, code, codeVerifier)
    sessionStore.addSession(serverUrl, tokens)
  }
}
```

---

## Маршруты API

Все эндпоинты под единым префиксом `/api/`. Middleware проверки accessToken применяется ко всему `/api/*` кроме публичных маршрутов.

```
Публичные (без accessToken):
  GET  /api/auth/login           — страница авторизации OAuth (redirect на неё)
  POST /api/auth/token           — обмен code на токены (защищён PKCE)

Приватные (требуют accessToken):
  GET  /api/session/status       — проверка живости сессии
  POST /api/session/refresh      — rotation refreshToken
  POST /api/session/logout       — выход (текущая сессия или все)
  ...  /api/*                    — все остальные маршруты мессенджера
```

```javascript
// Middleware: проверка accessToken
// Применяется ко всему /api/* кроме публичных эндпоинтов
const PUBLIC = ['/auth/login', '/auth/token', '/session/refresh']  // req.path внутри use('/api') не содержит префикс /api

app.use('/api', (req, res, next) => {
  if (PUBLIC.includes(req.path)) return next()
  return requireAccessToken(req, res, next)
})
```

`/api/auth/token` публичный — в момент обмена кода у клиента ещё нет accessToken. Защита этого эндпоинта — PKCE: без валидной пары `code` + `codeVerifier` сервер ничего не выдаст.

`/api/session/refresh` тоже публичный для middleware accessToken — refresh вызывается именно когда accessToken истёк, то есть middleware отклонил бы его с тем же `401` до попадания в хендлер. Защита этого эндпоинта — refreshToken-валидация внутри самого хендлера: без валидного refreshToken rotation не произойдёт.

---

## Токены

### Схема

Исключён **stateless JWT** — когда сервер доверяет токену только по подписи без проверки в БД. Такой токен нельзя отозвать мгновенно.

Оба токена — stateful CUID. Клиент не читает токены напрямую (они в httpOnly cookie).

```
accessToken:  CUID, 15 минут  — httpOnly cookie, Path=/api/
refreshToken: CUID, 30 дней   — httpOnly cookie, Path=/api/session/refresh
```

Токены обновляются реактивно через 401-interceptor — проактивный планировщик не нужен. `expiresAt` сервер может возвращать опционально для нужд UI.

В базе хранятся только хэши токенов, не сами токены. Если база утечёт — хэши без оригинальных строк бесполезны.

### Схема БД

```sql
sessions:
  id
  accessTokenHash       -- hash(accessToken), индекс — поиск при каждом запросе
  refreshTokenHash      -- hash(refreshToken), индекс — поиск при rotation
  sessionId             -- plain UUID/CUID, группирует цепочку ротации
  userId                -- FK на users
  clientType            -- "web" | "expo" — определяет ожидаемый канал доставки токена
  status                -- active | used | expired | revoked
  prevSessionId         -- NULL | UNIQUE FK → sessions.id — кто породил эту сессию
  nextSessionId         -- NULL | UNIQUE FK → sessions.id — кого породила эта сессия
                        -- UNIQUE гарантирует что ветвление цепочки невозможно на уровне БД
  accessTokenExpiresAt  -- +15 минут от createdAt
  refreshTokenExpiresAt -- +30 дней от createdAt
  refreshUsedAt         -- когда refreshToken был использован для rotation
  noActiveAt            -- NULL | timestamp — момент когда сессия перестала быть active
                        -- проставляется при любом переходе из active
  noActiveReason        -- NULL | logout_current | logout_all |
                        --        reuse_detected | manual_revoke | lockdown | expired
  noActiveDescribe      -- NULL | текстовый комментарий — заполняется только при manual_revoke
  createdAt
```

**Статусы сессии**

```
active   — живая сессия
used     — refreshToken использован, запись стала историей цепочки ротации
expired  — истёк refreshTokenExpiresAt
           проставляется лениво при обращении
           или инфраструктурно раз в сутки в полночь по timezone сервера
revoked  — отозвана явно: logout, атака, администратор
```

**Инфраструктурный обход истёкших сессий**

Docker контейнер по умолчанию работает в UTC — timezone хостовой машины не наследуется. `TZ` должна быть выставлена явно, иначе cron сработает в UTC 00:00 вне зависимости от настройки.

```yaml
maintenance:
  expired_sessions_cleanup: "0 0 * * *"  # cron, полночь по TZ
  timezone: "Europe/Moscow"              # берётся из общего конфига сервера
```

```yaml
# docker-compose.yml — TZ обязательно явно
environment:
  - TZ=Europe/Moscow  # должно совпадать с maintenance.timezone
```

```sql
-- Запускается по расписанию, помечает все протухшие активные сессии
UPDATE sessions
SET
  status        = 'expired',
  noActiveAt    = NOW(),
  noActiveReason = 'expired'
WHERE status = 'active'
  AND refreshTokenExpiresAt < NOW()
```

`status = 'used'` не трогаем — промежуточное состояние цепочки ротации, не конец жизни сессии.

### Refresh Token Rotation с Reuse Detection

При каждом обновлении refreshToken инвалидируется и выдаётся новый. Старый помечается как `used`. Если кто-то обратился с уже использованным токеном — это сигнал компрометации.

```
Проверка accessToken при каждом запросе:
1. Получили accessToken
2. Нашли запись по accessTokenHash
3. status != active → 401
4. accessTokenExpiresAt < now
   → status = expired, noActiveAt = now, noActiveReason = expired → 401
5. Всё ок → пропускаем запрос

Rotation refreshToken:
1. Получили refreshToken
2. Нашли запись по refreshTokenHash
3. status = used  → АТАКА — поведение определяется режимом настороженности
4. status = revoked | expired → 401
5. refreshTokenExpiresAt < now
   → status = expired, noActiveAt = now, noActiveReason = expired → 401
6. Всё ок
   → status = used, refreshUsedAt = now, nextSessionId = <новая запись>
   → новая запись с тем же sessionId, prevSessionId = <текущая запись>
   → свежая пара accessToken + refreshToken
```

> Шаги 2-6 должны выполняться как единая атомарная операция через `UPDATE ... WHERE status = 'active' RETURNING`. Разделение на SELECT + UPDATE создаёт race condition при конкурентных запросах с одним токеном — оба пройдут SELECT до того как первый запишет `status = used`, Reuse Detection не сработает.

При отзыве скомпрометированной цепочки:

```sql
UPDATE sessions
SET
  status         = 'revoked',
  noActiveAt     = NOW(),
  noActiveReason = 'reuse_detected'
WHERE sessionId = ? AND userId = ?
```

### Refresh — реактивная модель (401-interceptor)

Оба клиента используют реактивный подход: токен не обновляется заранее по таймеру, а только когда сервер вернул `401`. Это упрощает инфраструктуру и корректно работает на всех платформах.

Реализация через `axios` + `axios-auth-refresh`:

```javascript
import axios from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'

// Web — cookie отправляется браузером автоматически
const refreshAuthLogic = async (failedRequest) => {
  const response = await axios.post(`${serverUrl}/api/session/refresh`, {}, {
    withCredentials: true
  })
  if (!response.data) throw new Error('refresh failed')
  // cookie обновился на сервере — клиент ничего не делает вручную
}

// Expo — refreshToken из SecureStore
const refreshAuthLogicExpo = async (failedRequest) => {
  const refreshToken = await SecureStore.getItemAsync(`refreshToken:${serverUrl}`)
  const response = await axios.post(`${serverUrl}/api/session/refresh`, {}, {
    headers: { Authorization: `Bearer ${refreshToken}` }
  })
  if (!response.data) throw new Error('refresh failed')
  const { accessToken, refreshToken: newRefreshToken } = response.data
  await SecureStore.setItemAsync(`accessToken:${serverUrl}`, accessToken)
  await SecureStore.setItemAsync(`refreshToken:${serverUrl}`, newRefreshToken)
}

createAuthRefreshInterceptor(axiosInstance, refreshAuthLogic)  // web
createAuthRefreshInterceptor(axiosInstance, refreshAuthLogicExpo)  // expo
```

`axios-auth-refresh` автоматически держит очередь конкурентных запросов — если несколько запросов одновременно получили `401`, refresh выполняется один раз, затем все запросы повторяются.

### Edge case — несколько вкладок браузера (web)

Если приложение открыто в нескольких вкладках и обе одновременно получат `401` — обе обратятся к refresh эндпоинту. Это вызовет Reuse Detection: первый запрос сработает, второй получит `used` токен.

`BroadcastChannel` с переменной `isRefreshing` не решает проблему — каждая вкладка имеет свой JS runtime.

**Решение — SharedWorker**

SharedWorker — браузерный API, один экземпляр на все вкладки одного домена. Вкладка, получившая `401`, делегирует refresh Worker'у. Worker выполняет один запрос и уведомляет все вкладки о результате.

```javascript
// shared-worker.js — один экземпляр на все вкладки
const ports = new Set()
let isRefreshing = false  // общий для всех вкладок — Worker один

onconnect = (e) => {
  const port = e.ports[0]
  port.start()
  ports.add(port)

  port.addEventListener("message", async (e) => {
    if (e.data.type === "refresh") {
      if (isRefreshing) return  // уже идёт, игнорируем повторный запрос
      isRefreshing = true
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20_000)

      try {
        const response = await fetch(`${e.data.serverUrl}/api/session/refresh`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal
        })
        clearTimeout(timeout)
        if (!response.ok) throw new Error('refresh failed')
        ports.forEach(p => p.postMessage({ type: "refreshed" }))
      } catch {
        ports.forEach(p => p.postMessage({ type: "refresh_failed" }))
      } finally {
        isRefreshing = false
      }
    }
  })
}
```

```javascript
// refreshAuthLogic для web — делегирует refresh Worker'у
const refreshAuthLogic = (failedRequest) => new Promise((resolve, reject) => {
  worker.port.postMessage({ type: "refresh", serverUrl })

  // addEventListener — не перезаписывает хендлер при параллельных вызовах
  worker.port.addEventListener("message", function handler(e) {
    if (e.data.type === "refreshed") {
      worker.port.removeEventListener("message", handler)
      resolve()
    }
    if (e.data.type === "refresh_failed") {
      worker.port.removeEventListener("message", handler)
      reject(new Error('refresh failed'))
    }
  })
})

createAuthRefreshInterceptor(axiosInstance, refreshAuthLogic)
```

Cookie httpOnly обновился на сервере один раз — браузер автоматически использует новый cookie во всех вкладках при повторе запросов.

**SharedWorker живёт пока открыта хотя бы одна вкладка.** При закрытии последней вкладки завершается. При открытии новой — стартует заново.

SharedWorker также используется как единственное WebSocket подключение на все вкладки — сообщения от сервера приходят в Worker и рассылаются всем подключённым вкладкам.

### Хранение токенов

**HTTPS обязателен** — `SameSite=None; Secure` работает только по HTTPS. HTTP деплой невозможен.

**Где что хранится и через какой канал**

```
Web:
  accessToken  → httpOnly cookie, SameSite=None; Secure; Path=/api/
  refreshToken → httpOnly cookie, SameSite=None; Secure; Path=/api/session/refresh
  канал        → Cookie заголовок, автоматически браузером

Expo:
  accessToken  → expo-secure-store (Keychain на iOS, Keystore на Android)
  refreshToken → expo-secure-store
  канал        → Authorization: Bearer заголовок
```

**Path scoping** — cookie физически не может попасть на неправильный endpoint:

```
accessToken  → Path=/api/              — отправляется на все /api/... маршруты
refreshToken → Path=/api/session/refresh — только на этот конкретный endpoint
```

**CORS по путям**

```
Все маршруты → Access-Control-Allow-Origin: <reflect Origin>
               Access-Control-Allow-Credentials: true
               Vary: Origin
```

`Access-Control-Allow-Origin: *` несовместим с `credentials: include` — браузер выбрасывает ошибку. Сервер отражает Origin из запроса обратно. Это безопасно: секрет в httpOnly cookie, JS его не читает независимо от origin. `Vary: Origin` обязателен для корректной работы HTTP-кешей и прокси.

**Обмен code на токены (Web)**

```javascript
const response = await fetch(`${serverUrl}/api/auth/token`, {
  method: "POST",
  credentials: "include",
  body: JSON.stringify({ code, codeVerifier })
  // clientType не используется сервером —
  // тип определяется автоматически по redirect_uri
})

// Сервер устанавливает cookie:
// Set-Cookie: accessToken=<cuid>;  HttpOnly; Secure; SameSite=None; Path=/api/
// Set-Cookie: refreshToken=<cuid>; HttpOnly; Secure; SameSite=None; Path=/api/session/refresh
const { sessionId } = await response.json()
```

**Обмен code на токены (Expo)**

```javascript
const response = await fetch(`${serverUrl}/api/auth/token`, {
  method: "POST",
  body: JSON.stringify({ code, codeVerifier })
})
const { accessToken, refreshToken, sessionId } = await response.json()

await SecureStore.setItemAsync(`accessToken:${serverUrl}`, accessToken)
await SecureStore.setItemAsync(`refreshToken:${serverUrl}`, refreshToken)
```

**Session status endpoint — проверка сессии при старте**

При старте клиента — проверяем живость сессии. Если accessToken истёк — `axios-auth-refresh` подхватит `401` и выполнит refresh автоматически.

```
GET /api/session/status
  credentials: include (web) / Authorization: Bearer (expo)

→ 200 { sessionId }   — сессия живая
→ 401                 — токен истёк → axios-auth-refresh → refresh → повторить
                        если refresh тоже 401 → переавторизация
```

**clientType определяется по redirect_uri, не по самодекларации**

Сервер определяет тип клиента сам — не доверяет полю `clientType` из тела запроса:

```
redirect_uri начинается с https://  → clientType = "web"
redirect_uri начинается с kotel:// → clientType = "expo"
```

Это предотвращает подмену fingerprint через изменение `clientType` в запросе.

**Проверка канала доставки**

```
web сессия:   ожидаем токен в Cookie заголовке
              если пришёл в Authorization: Bearer → аномалия → режим настороженности

expo сессия:  ожидаем токен в Authorization: Bearer
              если пришёл в Cookie → аномалия → режим настороженности
```

**Cold start на Expo** — при старте приложения читаем токены из SecureStore и делаем любой запрос к `/api/`. Если accessToken истёк — `axios-auth-refresh` подхватит `401` и выполнит refresh автоматически. Если и refreshToken истёк — чистим SecureStore и показываем экран авторизации.

### Logout

Клиент всегда чистит локальные данные — даже если запрос на сервер упал. Но если сеть упала в момент logout — сессия на сервере живёт до истечения refreshToken (30 дней). Решение — retry очередь + предупреждение при критичных сценариях.

```javascript
async function logout(serverUrl, allDevices = false) {
  try {
    const isExpo = Platform.OS !== 'web'
    const headers = { 'Content-Type': 'application/json' }

    if (isExpo) {
      const accessToken = await SecureStore.getItemAsync(`accessToken:${serverUrl}`)
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    }

    await fetch(`${serverUrl}/api/session/logout`, {
      method: "POST",
      credentials: isExpo ? "omit" : "include",
      headers,
      body: JSON.stringify({ allDevices })
    })
  } catch {
    // Сеть упала — ставим в очередь, повторим при восстановлении
    logoutQueue.add({ serverUrl, allDevices })

    // Если выход со всех устройств — предупреждаем пользователя
    if (allDevices) {
      showWarning(
        "Не удалось завершить все сессии на сервере. " +
        "Для гарантированного выхода — обратитесь к администратору."
      )
    }
  } finally {
    // Чистим локально всегда
    sessionStore.removeSession(serverUrl)
    // Expo
    await SecureStore.deleteItemAsync(`accessToken:${serverUrl}`)
    await SecureStore.deleteItemAsync(`refreshToken:${serverUrl}`)
  }
}

// При восстановлении сети — повторяем все отложенные logout
network.onReconnect(() => logoutQueue.flush())
```

```
Обычный logout            → retry очередь, тихо повторяем при сети
Logout всех устройств     → retry очередь + предупреждение пользователю
  при подозрении на кражу   с рекомендацией обратиться к администратору
```

Принудительный отзыв всех сессий администратором — гарантированный способ закрыть все сессии даже если logout не дошёл до сервера.

```
Выход с текущего устройства  → сервер отзывает текущий sessionId
Выход со всех устройств      → сервер отзывает все сессии пользователя
```

### Rate limiting на /api/auth

Защита от брутфорса при вводе пароля. Два независимых счётчика работают одновременно.

**Проблемы наивного rate limiting**

```
NAT:               офис, университет — сотни пользователей за одним IP
                   один сотрудник ошибся 10 раз → весь офис заблокирован

Distributed:       атакующий пробует 4 пароля с каждого из N IP адресов
                   порог по IP никогда не достигается
                   перебор идёт бесконечно со скоростью 4 × N попыток в минуту
```

**Счётчик по IP — sliding window + CAPTCHA**

Sliding window — счётчик не сбрасывается резко, скользит по времени. Одна ошибка в час не накапливается с ошибками из прошлого часа.

```
1-3 попытки с IP   → без ограничений
4-6 попыток с IP   → CAPTCHA на каждую попытку
7+ попыток с IP    → блокировка IP на 15 минут
```

Офисный NAT получает CAPTCHA, не полную блокировку. Один сотрудник не блокирует весь офис.

**Счётчик по username — независимо от IP**

Суммирует попытки со всех IP адресов. Защита от distributed brute force:

```
user@example.com + IP-1: неверный пароль → счётчик: 1
user@example.com + IP-2: неверный пароль → счётчик: 2
user@example.com + IP-3: неверный пароль → счётчик: 3
...
user@example.com + IP-10: неверный пароль → счётчик: 10 → блокировка аккаунта
```

Distributed brute force упирается в порог по username независимо от количества IP.

**Конфигурация**

```yaml
security:
  rate_limiting:
    # Период скользящего окна
    window: 15m

    # По IP — sliding window
    ip_captcha_threshold: 4      # после 4 попыток — CAPTCHA
    ip_block_threshold: 7        # после 7 попыток — блокировка IP
    ip_block_duration: 15m

    # По username — суммарно со всех IP
    username_block_threshold: 10
    username_block_duration: 15m

    # Прогрессивные задержки
    backoff:
      - attempts: 4
        delay: 5s
      - attempts: 6
        delay: 30s
```

Клиент получает `429 Too Many Requests` — реализация полностью на стороне сервера, одинакова для web и Expo.

---

## Безопасность токенов

### Базовый уровень — fingerprint сессии

При выдаче токена сервер записывает `redirect_uri` (адрес клиента) как часть сессии. Запросы с несовпадающим Origin логируются как аномалия и переводят сессию в режим настороженности. Для state-changing эндпоинтов (refresh, logout) несовпадение Origin должно приводить к отклонению запроса — это обязательное поведение, не опциональное. Защищает от случайных и ленивых атак, даёт аудит.

### Продвинутый уровень — DPoP (RFC 9449)

Криптографическая привязка токена к конкретному браузеру/клиенту. Украденный токен без приватного ключа бесполезен.

**Принцип работы:**

```javascript
// Клиент генерирует пару ключей при первом запуске
const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  false,        // extractable: false — ключ нельзя экспортировать из браузера
  ["sign", "verify"]
)

// Публичный ключ отправляется на сервер при авторизации
// Приватный ключ остаётся в браузере навсегда

// Каждый запрос подписывается приватным ключом
const dpopProof = await signRequest(keyPair.privateKey, {
  method: "GET",
  url: "https://serverA.com/api/messages",
  timestamp: Date.now()
})

fetch("https://serverA.com/api/messages", {
  headers: {
    "Authorization": `Bearer ${token}`,
    "DPoP": dpopProof
  }
})
```

Сервер при каждом запросе проверяет: токен валиден + подпись соответствует публичному ключу привязанному к этому токену.

**Хранение ключей:** IndexedDB с `extractable: false` — переживает перезагрузку, не может быть экспортирован JavaScript-кодом.

> DPoP рекомендуется отложить на более поздний этап разработки. Реализовать после того как базовый OAuth 2.0 flow стабильно работает.

---

## Режим настороженности

Определяет поведение сервера при срабатывании Reuse Detection. Настраивается администратором.

```
Отладка    — только логируем инцидент, сессии не трогаем
             ⚠️ Не рекомендуется на боевом сервере — только для dev режима

Изоляция   — отзываем скомпрометированный sessionId
             Остальные сессии пользователя живут

Карантин   — отзываем все сессии и все refreshToken пользователя
             Пользователь может войти заново через OAuth самостоятельно
             Рекомендуется как режим по умолчанию

Локдаун    — всё как в Карантине
             + пароль помечается как скомпрометированный
             + аккаунт блокируется до ручного вмешательства администратора
```

Уведомления — независимые опции, работают на любом уровне:

```
notify_admin:  уведомить администратора об инциденте
notify_user:   уведомить пользователя об инциденте
```

**Конфиг:**

```yaml
security:
  reuse_detection_mode: quarantine  # debug | isolation | quarantine | lockdown
                                    # default: quarantine
                                    # debug: только для dev режима, не для боевого сервера
  notify_admin: true
  notify_user: true
```

**Примеры конфигурации под разные сценарии:**

```yaml
# Корпоративный сервер — жёсткий контроль, тихая блокировка
security:
  reuse_detection_mode: lockdown
  notify_admin: true
  notify_user: false

# Семейный сервер — мягко, но пользователь в курсе
security:
  reuse_detection_mode: isolation
  notify_admin: false
  notify_user: true

# Dev окружение
security:
  reuse_detection_mode: debug
  notify_admin: false
  notify_user: false
```

---

## Клиентская часть

### Web

- SPA на любом домене или localhost
- HTTP клиент: `axios` + `axios-auth-refresh` — автоматический refresh по 401, очередь конкурентных запросов
- Авторизация через popup окно с PKCE + state
- Хранение токенов: httpOnly cookie (браузер управляет сам) — см. раздел "Хранение токенов"
- SharedWorker координирует refresh между вкладками и держит единое WebSocket подключение
- Параллельные независимые сессии к N серверам

### Expo (mobile)

- Отдельный клиент, та же логика сессий
- HTTP клиент: `axios` + `axios-auth-refresh` — автоматический refresh по 401, очередь конкурентных запросов
- Авторизация через системный браузер (`expo-web-browser`) — не WebView, адресная строка видна
- Deep Links (`kotel://auth/callback`) для получения callback от сервера
- PKCE + state обязательны — см. раздел "Авторизация на мобильном"
- Хранение токенов: expo-secure-store (Keychain на iOS, Keystore на Android)

### Структура стора клиента

```javascript
// Каждая сессия независима
// Токены в httpOnly cookie (web) или SecureStore (expo) — в стор не попадают
// В сторе только то что нужно для UI
sessions: {
  "https://serverA.com": { sessionId: "cuid_abc", user: { ... } },
  "https://serverB.com": { sessionId: "cuid_xyz", user: { ... } },
  "https://serverC.com": { sessionId: "cuid_qwe", user: { ... } }
}
```

---

## Обнаружение рекомендованного клиента

Сервер может сообщить пользователю какой клиент рекомендован администратором. Клиент при добавлении нового сервера запрашивает эту информацию и показывает её как справочную.

```
GET https://serverA.com/.well-known/client
→ { "recommended_client": "https://official-client.com" }
```

**Важно — только информация, не призыв к действию**

Рекомендация исходит от самого сервера и не верифицируется независимой стороной. Скомпрометированный сервер может указать любой URL. Поэтому UI показывает информацию без кнопки перехода:

```
Было (небезопасно):
  ⚠️ Этот сервер рекомендует другой клиент. Перейти?
  [Открыть рекомендованный клиент]  ← кнопку нажимают не глядя

Стало (безопасно):
  ℹ️ Рекомендованный клиент этого сервера: https://official-client.com
     — только информация, пользователь сам принимает решение
```

> Рекомендация клиента не верифицируется. Не переходите по незнакомым URL из этого поля — они могут вести на фишинговый клиент.

---

## Деплой сервера

Цель — максимально простой деплой для любого желающего.

**HTTPS обязателен** — `SameSite=None; Secure` cookie не работает на HTTP. Это архитектурное требование, не опция.

**First-run validation** — сервер при старте проверяет секреты. Если `SECRET_KEY` не изменён — не стартует:

```
❌ Сервер не может запуститься.

SECRET_KEY не изменён — используется дефолтное значение.

Замените значение в docker-compose.yml или переменных окружения.
Генерация SECRET_KEY:
  openssl rand -hex 32
```

```yaml
# docker-compose.yml
services:
  messenger:
    image: yourmessenger/server:latest
    ports:
      - "3000:3000"
    environment:
      - SECRET_KEY=   # обязательно заполнить перед запуском
                      # openssl rand -hex 32
    volumes:
      - ./data:/app/data
```

Администратор — обычный пользователь с ролью `admin`. Создаётся через CLI или интерфейс при первом запуске. Отдельного системного пароля нет.

**Dev окружение**

HTTPS обязателен и для локальной разработки. Рекомендуется mkcert с кастомным `.localhost` доменом:

```bash
# Устанавливаем локальный CA
mkcert -install

# Генерируем сертификат для кастомного домена
mkcert kotel.localhost

# Браузер доверяет сертификату без предупреждений
# Сервер доступен по https://kotel.localhost
```

`SameSite=None; Secure` работает на `.localhost` домене с TLS — поведение идентично production.

---

## Implementation Decisions

Этот раздел фиксирует конкретные implementation-решения, принятые после обсуждения, и связывает их с исходными концептуальными разделами документа.

### 1) Token hashing: SHA-256

**Решение:** для `accessToken` и `refreshToken` используется хэширование SHA-256.  
**Связано с:** разделами [PKCE (RFC 7636)](#pkce-rfc-7636--обязателен-для-web-и-mobile) и [Токены](#токены).  
**Почему:** единый криптографический примитив упрощает модель безопасности и соответствует требованию RFC 7636 (S256).

### 2) Token generation: `crypto.randomBytes(32).toString('hex')`

**Решение:** генерация токенов выполняется через CSPRNG (`crypto.randomBytes(32)`), итоговая длина — 256 бит энтропии в hex-представлении.  
**Связано с:** разделом [Токены](#токены).  
**Почему:** это криптографически стойкий источник случайности; CUID не используется для auth-токенов.

### 3) Auth code storage: in-memory `Map` + TTL

**Решение:** OAuth `code` хранится в памяти процесса (`Map`) с коротким TTL (30-60 секунд).  
**Связано с:** разделом [Авторизация — OAuth 2.0](#авторизация--oauth-20).  
**Почему:** код одноразовый и краткоживущий, потеря при перезапуске процесса допустима для данной модели.

### 4) Deep-link scheme: `kotel://`

**Решение:** схема deep link стандартизирована как `kotel://` (вместо legacy-схемы).  
**Связано с:** разделом [Авторизация на мобильном — Deep Links](#авторизация-на-мобильном--deep-links).  
**Почему:** это актуальное имя проекта и единая схема для mobile OAuth callback.

### 5) Roles: `user | admin | root`

**Решение:** ролевая модель трёхуровневая: `user`, `admin`, `root`.  
**Детали:** `root` — супер-администратор (ровно один на сервер), не удаляется, создаётся на первом запуске. `admin` имеет почти те же возможности, но не управляет другими администраторами и назначается/снимается только `root`.  
**Связано с:** разделами [Концепция](#концепция) и [Деплой сервера](#деплой-сервера).  
**Почему:** нужна жёсткая иерархия управления для self-hosted сценария.

### 6) Atomic refresh rotation via SQL `UPDATE ... RETURNING`

**Решение:** ротация refresh-токена выполняется атомарно через raw SQL (`prisma.$queryRaw`) с шаблоном `UPDATE ... WHERE status = 'active' RETURNING ...`.  
**Связано с:** разделом [Refresh Token Rotation с Reuse Detection](#refresh-token-rotation-с-reuse-detection).  
**Почему:** исключает race condition, описанный в документе для неатомарной схемы `SELECT + UPDATE`.

### 7) SameSite cookie policy: always `SameSite=None`

**Решение:** cookie авторизации всегда выставляются с `SameSite=None` (и `Secure`).  
**Связано с:** разделом [Хранение токенов](#хранение-токенов).  
**Почему:** поддержка кросс-доменных сценариев между клиентом и self-hosted сервером является обязательной.

### 8) Login page delivery: static HTML from backend

**Решение:** страница логина обслуживается backend-ом как статический HTML (NestJS `ServeStaticModule`), MVP без стилизации.  
**Связано с:** разделом [Маршруты API](#маршруты-api).  
**Почему:** минимизирует сложность и ускоряет поставку OAuth entrypoint.

### 9) Callback page (web): `/callback` in frontend SPA

**Решение:** callback-страница реализуется как маршрут `/callback` во frontend SPA (TanStack Router).  
**Связано с:** разделом [Авторизация — OAuth 2.0](#авторизация--oauth-20).  
**Почему:** соответствует уже описанному postMessage-flow и упрощает интеграцию popup-авторизации.

### 10) Configuration: `process.env.*` only

**Решение:** источником конфигурации служат только переменные окружения (`process.env.*`). YAML-конфиг и `@nestjs/config` не используются.  
**Связано с:** разделом [Деплой сервера](#деплой-сервера).  
**Почему:** единый механизм конфигурации проще для docker-compose и production/development parity.

### 11) First-run setup: `GET /api/setup/status` + `POST /api/setup/init`

**Решение:** инициализация первого пользователя выполняется отдельным setup-flow:  
- `GET /api/setup/status` — проверка, требуется ли инициализация;  
- `POST /api/setup/init` — создание `root`, если пользователей ещё нет.  
**Связано с:** разделами [Маршруты API](#маршруты-api) и [Деплой сервера](#деплой-сервера).  
**Почему:** после одноразовой инициализации дальнейший вход всегда идёт через обычный OAuth flow.

### 12) Multi-server client: full implementation

**Решение:** мультисерверный клиент реализован полноценно: Jotai-стор с ключом по URL сервера и навигация через sidebar.  
**Связано с:** разделами [Концепция](#концепция) и [Структура стора клиента](#структура-стора-клиента).  
**Почему:** это базовый продуктовый сценарий, а не опциональная возможность.

### 13) Two-server dev environment

**Решение:** локальная разработка поддерживает два сервера одновременно: `kotel.localhost` и `katel.localhost`, каждый со своим PostgreSQL и backend, при общем Traefik и одном frontend.  
**Связано с:** разделом [Деплой сервера](#деплой-сервера).  
**Почему:** позволяет проверять мультисерверные пользовательские сценарии в реальном dev-контуре.

---

## Известные ограничения

- Пользователи разных серверов не могут общаться между собой — это осознанное архитектурное решение
- При входе на новый клиент нужно заново авторизоваться на каждом сервере по одному
- Разные логины и пароли на разных серверах — рекомендуется менеджер паролей
- Цифровая гигиена: пользователям рекомендуется использовать только проверенные клиенты
- **Retry-очередь logout** — хранится в памяти и теряется при закрытии вкладки до восстановления сети. Сессия на сервере живёт до истечения refreshToken (30 дней). Гарантированный способ закрыть все сессии — принудительный отзыв администратором.
- **Deep link hijacking на Android** — custom URL scheme `kotel://` не верифицируется ОС. Любое приложение может зарегистрировать ту же схему и перехватить `code` из callback. Полноценное решение (App Links) требует привязки к конкретному `package_name` и сертификату — несовместимо с open source моделью где каждый может собрать форк. Принято как ограничение: `code` без `codeVerifier` бесполезен для получения токенов, а `state` защищает от подброса чужого `code`. Реальный вектор — только DoS на авторизацию конкретного пользователя, не компрометация аккаунта.
- **`notify_user` в режиме Локдаун** — канал уведомления не определён архитектурно. Осознанное решение: сервер рассчитан максимум на 100 пользователей, администратор знает каждого лично. Локдаун — экстраординарное событие, прямой контакт надёжнее любого автоматического уведомления. Обработка на усмотрение администратора.

---

## Целевая аудитория

- Технари и privacy-осознанные пользователи ищущие self-hosted альтернативы
- Малый бизнес и небольшие команды которым нужен простой корпоративный мессенджер без утечки данных
- Закрытые сообщества: семья, друзья, клубы по интересам

---

## Аналоги для изучения

| Проект | Чем полезен для изучения |
|---|---|
| Matrix / Element | Мультисерверный клиент, OAuth flow |
| Mattermost | Self-hosted корпоративный мессенджер, деплой |
| Rocket.Chat | Self-hosted, архитектура сервера |
| SimpleX | Privacy-first подход, отсутствие идентификаторов |
