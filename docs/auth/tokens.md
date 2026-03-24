# Токены и хранение

> Связанные файлы: [OAuth flow](./oauth-flow.md) · [Сессии и ротация](./sessions.md)

## Токены

### Схема

Исключён **stateless JWT** — когда сервер доверяет токену только по подписи без проверки в БД. Такой токен нельзя отозвать мгновенно.

Оба токена — stateful случайные строки (`randomBytes(32).toString('hex')`, 64 hex-символа).
Клиент не читает web-токены напрямую (они в httpOnly cookie).

```
accessToken:  random hex string, 15 минут  — httpOnly cookie, Path=/api/
refreshToken: random hex string, 30 дней   — httpOnly cookie, Path=/api/session/refresh
```

Токены обновляются реактивно через 401-interceptor — проактивный планировщик не нужен. `expiresAt` сервер может возвращать опционально для нужд UI.

В базе хранятся только хэши токенов, не сами токены. Если база утечёт — хэши без оригинальных строк бесполезны.

### Схема БД

```sql
sessions:
  id
  accessTokenHash
  refreshTokenHash
  sessionId
  userId
  clientType
  status
  prevSessionId
  nextSessionId
  accessTokenExpiresAt
  refreshTokenExpiresAt
  refreshUsedAt
  noActiveAt
  noActiveReason
  noActiveDescribe
  createdAt
```

**Статусы сессии**

```
active   — живая сессия
used     — refreshToken использован
expired  — истёк refreshTokenExpiresAt
revoked  — отозвана явно: logout, атака, администратор
```

**Очистка истёкших сессий**

```text
В коде cleanup запускается:
- при старте backend (`onModuleInit`)
- далее по интервалу 1 час (`setInterval`)

Критерий: status = ACTIVE и refreshTokenExpiresAt < now
```

---

## Хранение токенов

**HTTPS обязателен** — `SameSite=None; Secure` работает только по HTTPS.

**Где что хранится и через какой канал**

```
Web:
  accessToken  → httpOnly cookie, SameSite=None; Secure; Path=/api/
  refreshToken → httpOnly cookie, SameSite=None; Secure; Path=/api/session/refresh
  канал        → Cookie заголовок, автоматически браузером

Expo:
  accessToken  → expo-secure-store
  refreshToken → expo-secure-store
  канал        → Authorization: Bearer заголовок
```

**Path scoping**

```
accessToken  → Path=/api/
refreshToken → Path=/api/session/refresh
```

**CORS по путям**

```
Все маршруты → Access-Control-Allow-Origin: <reflect Origin>
               Access-Control-Allow-Credentials: true
               Vary: Origin
```

### Обмен code на токены (Web)

```javascript
const response = await fetch(`${serverUrl}/api/auth/token`, {
  method: "POST",
  credentials: "include",
  body: JSON.stringify({ code, codeVerifier })
})
const { sessionId } = await response.json()
```

### Обмен code на токены (Expo)

```javascript
const response = await fetch(`${serverUrl}/api/auth/token`, {
  method: "POST",
  body: JSON.stringify({ code, codeVerifier })
})
const { accessToken, refreshToken, sessionId } = await response.json()
```

### Session status endpoint

```
GET /api/session/status
  credentials: include (web) / Authorization: Bearer (expo)

→ 200 { sessionId, user }   — сессия живая
→ 401                 — токен истёк → refresh → повторить
```

### clientType определяется по redirect_uri

```
redirect_uri начинается с https://  → clientType = "web"
иначе (в текущем коде)             → clientType = "expo"
```

### Проверка канала доставки

```
web сессия: ожидаем токен в Cookie
expo сессия: ожидаем токен в Authorization: Bearer
```
