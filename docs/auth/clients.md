# Клиентская часть

> Связанные файлы: [OAuth flow](./oauth-flow.md) · [Токены и хранение](./tokens.md)

## Клиентская часть

### Web

- SPA на любом домене или localhost
- HTTP клиент: `axios` + `axios-auth-refresh`
- Авторизация через popup окно с PKCE + state
- Хранение токенов: httpOnly cookie
- SharedWorker координирует refresh между вкладками и держит единое WebSocket подключение
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
  "https://serverA.com": { sessionId: "cuid_abc", user: { ... } },
  "https://serverB.com": { sessionId: "cuid_xyz", user: { ... } },
  "https://serverC.com": { sessionId: "cuid_qwe", user: { ... } }
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

**First-run validation** — сервер при старте проверяет секреты. Если `SECRET_KEY` не изменён — не стартует.

```yaml
services:
  messenger:
    image: yourmessenger/server:latest
    environment:
      - SECRET_KEY=
```

Администратор — обычный пользователь с ролью `admin`.

**Dev окружение**

Рекомендуется mkcert с кастомным `.localhost` доменом:

```bash
mkcert -install
mkcert kotel.localhost
```
