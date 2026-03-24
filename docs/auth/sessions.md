# Сессии и ротация

> Связанные файлы: [Токены](./tokens.md) · [Безопасность](./security.md)

## Refresh Token Rotation с Reuse Detection

При каждом обновлении refreshToken инвалидируется и выдаётся новый. Старый помечается как `used`. Если кто-то обратился с уже использованным токеном — это сигнал компрометации.

```
Проверка accessToken при каждом запросе:
1. Получили accessToken
2. Нашли запись по accessTokenHash
3. status != active → 401
4. accessTokenExpiresAt < now → status = expired → 401
5. Всё ок → пропускаем запрос

Rotation refreshToken:
1. Получили refreshToken
2. Нашли запись по refreshTokenHash
3. status = used  → АТАКА
4. status = revoked | expired → 401
5. refreshTokenExpiresAt < now → status = expired → 401
6. Всё ок → status = used + новая запись
```

> Шаги 2-6 должны выполняться как единая атомарная операция через `UPDATE ... WHERE status = 'active' RETURNING`.

При отзыве скомпрометированной цепочки:

```sql
UPDATE sessions
SET
  status         = 'revoked',
  noActiveAt     = NOW(),
  noActiveReason = 'reuse_detected'
WHERE sessionId = ? AND userId = ?
```

## Refresh — реактивная модель (401-interceptor)

Оба клиента используют реактивный подход: токен не обновляется заранее по таймеру, а только когда сервер вернул `401`.

```javascript
import axios from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'

const refreshAuthLogic = async () => {
  const response = await axios.post(`${serverUrl}/api/session/refresh`, {}, {
    withCredentials: true
  })
  if (!response.data) throw new Error('refresh failed')
}
```

`axios-auth-refresh` автоматически держит очередь конкурентных запросов.

## Edge case — несколько вкладок браузера (web)

Если приложение открыто в нескольких вкладках и обе одновременно получат `401` — обе обратятся к refresh эндпоинту. Это вызовет Reuse Detection.

**Решение — SharedWorker**

SharedWorker — один экземпляр на все вкладки одного домена. Вкладка делегирует refresh Worker'у, Worker выполняет один запрос и уведомляет все вкладки.

```javascript
const refreshAuthLogic = () => new Promise((resolve, reject) => {
  worker.port.postMessage({ type: "refresh", serverUrl })
  worker.port.addEventListener("message", function handler(e) {
    if (e.data.type === "refreshed") resolve()
    if (e.data.type === "refresh_failed") reject(new Error('refresh failed'))
  })
})
```

## Logout

Клиент всегда чистит локальные данные — даже если запрос на сервер упал. Но если сеть упала в момент logout — сессия на сервере живёт до истечения refreshToken (30 дней).

```javascript
async function logout(serverUrl, allDevices = false) {
  try {
    await fetch(`${serverUrl}/api/session/logout`, { method: "POST" })
  } catch {
    logoutQueue.add({ serverUrl, allDevices })
  } finally {
    sessionStore.removeSession(serverUrl)
  }
}
```

Принудительный отзыв всех сессий администратором — гарантированный способ закрыть все сессии даже если logout не дошёл до сервера.
