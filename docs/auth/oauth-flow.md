# OAuth 2.0 flow, PKCE и Deep Links

> Связанные файлы: [Токены и хранение](./tokens.md) · [Клиентская часть](./clients.md)

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

Здесь сервер принимает любой `redirect_uri` без предварительной регистрации клиента. Это осознанное решение, обоснованное моделью угроз.

> Динамическая регистрация клиентов (RFC 7591) в данной архитектуре избыточна. Закрытая регистрация пользователей является достаточным контролем.

### PKCE (RFC 7636) — обязателен для web и mobile

В JS коде и в мобильном приложении невозможно безопасно хранить `client_secret` — код можно прочитать или декомпилировать. PKCE решает это без необходимости в секрете.

**Два канала передачи**

```
Канал 1 — начало flow (через URL, открыто):
  webClientB → serverA: codeChallenge = SHA256(codeVerifier)

Канал 2 — обмен code на токены (через fetch body, закрыто):
  webClientB → serverA: codeVerifier (сырая строка)
```

**Полный flow на примере webClientB → serverA**

```text
Шаг 1 — webClientB генерирует PKCE пару и state локально в браузере
Шаг 2 — webClientB открывает popup на serverA
Шаг 3 — Пользователь вводит логин/пароль на странице serverA
Шаг 4 — serverA генерирует одноразовый code и редиректит
Шаг 5 — callback страница webClientB передаёт code в основное окно
Шаг 6 — основное окно проверяет state и обменивает code на токены
Шаг 7 — serverA проверяет PKCE
Шаг 8 — serverA выдаёт токены
```

**Что происходит если злой клиент перехватил code**

```text
Злой клиент пробует отправить code без верного codeVerifier.
serverA проверяет SHA256(codeVerifier) и отклоняет запрос.
```

**SHA256 — криптографически стойкая хэш функция**

Необратимость, детерминированность и устойчивость к коллизиям делают PKCE проверяемым и безопасным.

**Генерация codeVerifier — важный нюанс**

```javascript
// Web — правильно, по RFC 7636
function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}
```

**Правило — PKCE + state обязательны на обоих клиентах**

```
PKCE:  клиент доказывает серверу  — "этот code запросил я"
state: клиент доказывает себе    — "этот code я сам запрашивал"
```

### Авторизация на мобильном — Deep Links

На мобильном нет домена и нет popup. Приложение регистрирует свою URL схему на уровне ОС:

```
kotel://auth/callback
```

Страница авторизации открывается через системный браузер (`expo-web-browser`) — не через встроенный WebView.

```javascript
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import * as Crypto from "expo-crypto"
// ... см. исходный auth flow в приложении
```

---

## Маршруты API

Все эндпоинты под единым префиксом `/api/`. Middleware проверки accessToken применяется ко всему `/api/*` кроме публичных маршрутов.

```
Публичные (без accessToken):
  GET  /api/auth/login
  POST /api/auth/token

Приватные (требуют accessToken):
  GET  /api/session/status
  POST /api/session/refresh
  POST /api/session/logout
  GET  /api/admin/users
  POST /api/admin/users
  DELETE /api/admin/users/:id
  POST /api/admin/sessions/revoke
```

`/api/auth/token` публичный, потому что в момент обмена кода у клиента ещё нет accessToken. Защита — PKCE.
