# Клиентская часть

> Связанные файлы: [OAuth flow](./oauth-flow.md) · [Токены и хранение](./tokens.md)

## Клиентская часть

### Web

- SPA на любом домене или localhost
- HTTP клиент: `axios` + `axios-auth-refresh`
- Авторизация через popup окно с PKCE + state
- Хранение токенов: httpOnly cookie
- SharedWorker координирует refresh между вкладками (дедупликация `POST /api/session/refresh`)
- Параллельные независимые сессии к N серверам

### Expo (mobile)

- Отдельный клиент, та же логика сессий
- HTTP клиент: `axios` + `axios-auth-refresh`
- Авторизация через системный браузер (`expo-web-browser`)
- Deep Links (`kotel://auth/callback`) для получения callback
- PKCE + state обязательны
- Хранение токенов: expo-secure-store

### Структура стора клиента

```javascript
sessions: {
  "https://serverA.com": { sessionId: "550e8400-e29b-41d4-a716-446655440000", user: { ... } },
  "https://serverB.com": { sessionId: "b6b61fe4-6bb5-4934-8f08-71f9d23891f1", user: { ... } },
  "https://serverC.com": { sessionId: "0ef39a9e-fc84-4cd0-a5a9-9f1f67d4f125", user: { ... } }
}
```

---

## Обнаружение рекомендованного клиента

Сервер может сообщить пользователю какой клиент рекомендован администратором.

```
GET https://serverA.com/.well-known/client
→ { "recommended_client": "https://official-client.com" }
```

> Рекомендация клиента не верифицируется. Не переходите по незнакомым URL из этого поля.

---

## Деплой сервера

Цель — максимально простой деплой для любого желающего.

**HTTPS обязателен** — `SameSite=None; Secure` cookie не работает на HTTP.

**First-run setup** — инициализация выполняется через API:

```text
GET  /api/setup/status  -> { available: boolean }
POST /api/setup/init    -> создаёт первого пользователя с ролью ROOT (одноразово)
```

Администраторская модель в коде: `USER`, `ADMIN`, `ROOT`.

**Dev окружение**

Рекомендуется mkcert с кастомным `.localhost` доменом:

```bash
mkcert -install
mkcert kotel1.localhost
mkcert kotel2.localhost
```
