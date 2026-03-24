# Безопасность

> Связанные файлы: [Сессии](./sessions.md) · [Токены](./tokens.md)

## Безопасность токенов

### Базовый уровень — fingerprint сессии

При выдаче токена сервер сохраняет `fingerprint = origin(redirect_uri)` в сессии.
На защищенных маршрутах:
- если `Origin/Referer` совпадает с fingerprint или отсутствует — запрос продолжается;
- если не совпадает и это `GET` — пишется warning в лог;
- если не совпадает и это non-`GET` — запрос отклоняется (`403`).

### Продвинутый уровень — DPoP (RFC 9449, planned)

Криптографическая привязка токена к конкретному браузеру/клиенту. Украденный токен без приватного ключа бесполезен.

```javascript
const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  false,
  ["sign", "verify"]
)
```

Сейчас в коде DPoP не реализован. Это отложенное улучшение.

---

## Режим настороженности

Определяет поведение сервера при `Reuse Detection` и `Channel mismatch`.
Настраивается через env `REUSE_DETECTION_MODE`.

```
Отладка    — только логируем инцидент
Изоляция   — отзываем скомпрометированный sessionId
Карантин   — отзываем все сессии и refreshToken пользователя
Локдаун    — всё как в Карантине + блокировка аккаунта
```

**Конфиг (текущий):**

```bash
REUSE_DETECTION_MODE=quarantine
```

---

## Rate limiting на /api/auth

Защита от брутфорса при вводе пароля. Два независимых счётчика работают одновременно.

```text
RATE_LIMIT_WINDOW_SECONDS=900                # default 15m
RATE_LIMIT_IP_CAPTCHA_THRESHOLD=4
RATE_LIMIT_IP_BLOCK_THRESHOLD=7
RATE_LIMIT_USERNAME_BLOCK_THRESHOLD=10
captcha delay: 5s (фиксировано в коде)
```

При попытках 4-6 сервер также возвращает `captchaRequired: true` в `401`, чтобы клиент мог показать CAPTCHA-челлендж.
