# Step 01: Split AUTH_DESIGN.md into granular docs/auth/* files

## Goal

Replace the single monolithic `docs/AUTH_DESIGN.md` (1200 lines) with a set of small, focused files under `docs/auth/`. Add a Known Limitation about mobile HTTP downgrade. Replace `docs/AUTH_DESIGN.md` with an index file that links to all new files.

## Motivation

A 1200-line single file is hard to navigate and hard to maintain. Scoped AI rules (step 03) need to reference specific doc files. Small files also allow future updates to be more surgical.

## Type

docs, refactor

## Affected Area

- `docs/AUTH_DESIGN.md` — to be replaced by index
- `docs/auth/` — new directory with the following files:
  - `overview.md`
  - `oauth-flow.md`
  - `tokens.md`
  - `sessions.md`
  - `security.md`
  - `clients.md`
  - `implementation-decisions.md`

## Dependencies

None.

## Current Behavior

All auth architecture documentation lives in `docs/AUTH_DESIGN.md` as a single file with a table of contents at the top. The file starts with "# Auth Design, v12" and covers OAuth flow, PKCE, Deep Links, tokens, DB schema, rotation, reuse detection, rate limiting, fingerprint, alertness modes, client behavior, deployment, and implementation decisions.

## Expected Behavior

- `docs/AUTH_DESIGN.md` becomes an index file: brief description of the auth system and a list of links to `docs/auth/*.md` files.
- Each new file contains one cohesive topic and has cross-references to related files where needed.
- The new `docs/auth/clients.md` file gets an additional Known Limitation about mobile HTTP downgrade and callback screen behavior.

## Specification

### File structure

Create the directory `docs/auth/` and populate it as follows:

---

#### `docs/auth/overview.md`

Content from `AUTH_DESIGN.md`:
- Section "О документе" (What is discussed / What is intentionally not discussed)
- Section "Сценарии" (13 numbered scenarios with links — update the `#` anchors to point to new files)
- Section "Концепция"
- Section "Серверная часть"
- Section "Известные ограничения" (Known Limitations) — extend with new items (see below)
- Section "Целевая аудитория"
- Section "Аналоги для изучения"

Add to "Известные ограничения" two new items at the end:

```
- **Mobile HTTP downgrade для LAN** — мобильный клиент (`apps/mobile`) при обращении к серверу
  с IPv4-адресом хоста понижает `https://` до `http://`. Это dev/LAN workaround: в production
  сервер всегда доступен по hostname, а не по IPv4. Причина ограничения — отсутствие возможности
  настроить DNS для локальных доменов на Android/iOS устройстве в dev-окружении. В будущем
  проблема может быть решена через установку dev CA на устройство.

- **Mobile OAuth callback screen** — экран `app/auth/callback.tsx` в Expo-приложении является
  заглушкой: он не обрабатывает OAuth-параметры самостоятельно. Вся логика обмена code на
  токены выполняется внутри `WebBrowser.openAuthSessionAsync` → `addMobileServer`. Экран
  лишь производит редирект обратно в приложение через `router.replace`.
```

---

#### `docs/auth/oauth-flow.md`

Content from `AUTH_DESIGN.md`:
- Section "Авторизация — OAuth 2.0" (full, including "Почему это безопасно", "Открытый redirect_uri")
- Section "PKCE (RFC 7636)" (full, including code examples and explanations)
- Section "Авторизация на мобильном — Deep Links"
- Section "Маршруты API"

Add cross-reference at top:
```
> Связанные файлы: [Токены и хранение](./tokens.md) · [Клиентская часть](./clients.md)
```

---

#### `docs/auth/tokens.md`

Content from `AUTH_DESIGN.md`:
- Section "Токены" → sub-sections "Схема", "Схема БД", "Статусы сессии", "Инфраструктурный обход"
- Section "Хранение токенов" (httpOnly cookie, SecureStore, Path scoping, CORS по путям)
- Sub-sections "Обмен code на токены (Web)", "Обмен code на токены (Expo)"
- Sub-section "Session status endpoint"
- Sub-section "clientType определяется по redirect_uri"
- Sub-section "Проверка канала доставки"

Add cross-reference at top:
```
> Связанные файлы: [OAuth flow](./oauth-flow.md) · [Сессии и ротация](./sessions.md)
```

---

#### `docs/auth/sessions.md`

Content from `AUTH_DESIGN.MD`:
- Section "Refresh Token Rotation с Reuse Detection"
- Section "Refresh — реактивная модель (401-interceptor)"
- Section "Edge case — несколько вкладок браузера (web)"
- Section "Logout"

Add cross-reference at top:
```
> Связанные файлы: [Токены](./tokens.md) · [Безопасность](./security.md)
```

---

#### `docs/auth/security.md`

Content from `AUTH_DESIGN.md`:
- Section "Безопасность токенов" (Базовый уровень — fingerprint, Продвинутый уровень — DPoP)
- Section "Режим настороженности"
- Section "Rate limiting на /api/auth"

Add cross-reference at top:
```
> Связанные файлы: [Сессии](./sessions.md) · [Токены](./tokens.md)
```

---

#### `docs/auth/clients.md`

Content from `AUTH_DESIGN.md`:
- Section "Клиентская часть" → sub-sections "Web", "Expo (mobile)", "Структура стора клиента"
- Section "Обнаружение рекомендованного клиента"
- Section "Деплой сервера"

Add cross-reference at top:
```
> Связанные файлы: [OAuth flow](./oauth-flow.md) · [Токены и хранение](./tokens.md)
```

---

#### `docs/auth/implementation-decisions.md`

Content from `AUTH_DESIGN.md`:
- Section "Implementation Decisions" (all 13 sub-sections verbatim)

Add cross-reference at top:
```
> Это приложение к документации — конкретные технические решения.
> Основные разделы: [OAuth flow](./oauth-flow.md) · [Токены](./tokens.md) · [Сессии](./sessions.md) · [Безопасность](./security.md) · [Клиенты](./clients.md)
```

---

### Update `docs/AUTH_DESIGN.md`

Replace the entire content with a short index:

```markdown
# Auth Design

Архитектура системы авторизации разбита на отдельные файлы по темам:

- [Обзор и концепция](./auth/overview.md) — о документе, сценарии, известные ограничения
- [OAuth 2.0 flow, PKCE, Deep Links](./auth/oauth-flow.md) — авторизация, маршруты
- [Токены и хранение](./auth/tokens.md) — схема токенов, cookie, SecureStore, clientType
- [Сессии и ротация](./auth/sessions.md) — rotation, reuse detection, refresh, logout
- [Безопасность](./auth/security.md) — fingerprint, режимы настороженности, rate limiting
- [Клиентская часть](./auth/clients.md) — web, expo, стор, деплой
- [Implementation Decisions](./auth/implementation-decisions.md) — конкретные технические решения
```

---

### Cross-reference anchors

When updating the "Сценарии" section links in `overview.md`, replace `AUTH_DESIGN.md` internal anchor links with links to new files. For example:
- `[Авторизация — OAuth 2.0](#авторизация--oauth-20)` → `[Авторизация — OAuth 2.0](./oauth-flow.md#авторизация--oauth-20)`

## Acceptance Criteria

1. `docs/auth/` directory exists with all 7 files: `overview.md`, `oauth-flow.md`, `tokens.md`, `sessions.md`, `security.md`, `clients.md`, `implementation-decisions.md`.
2. `docs/AUTH_DESIGN.md` contains only the index (links to new files, no duplicated content).
3. All content from original `AUTH_DESIGN.md` is present in the new files without omissions.
4. `docs/auth/overview.md` "Известные ограничения" section contains the two new items about HTTP downgrade and callback screen.
5. Each new file has a cross-reference line at the top pointing to related files.
6. Internal anchor links in "Сценарии" in `overview.md` point to the new files.

## Verification Scenario

1. Open `docs/AUTH_DESIGN.md` — it should contain only the index with 7 links.
2. Follow any link — open the corresponding `docs/auth/*.md` file.
3. In each file, find the cross-reference line at the top.
4. Open `docs/auth/overview.md`, find "Известные ограничения" section — it should have the HTTP downgrade and callback screen items.
5. Open the Сценарии section links — each should open the correct sub-file.

## Testing

Manual only — documentation. No automated tests required.

## Notes

- Do NOT change the prose or meaning of any section. Only split by content and add cross-references.
- The document header comment "Документ сгенерирован в результате обсуждения с LLM моделью **Claude Sonnet 4.6** (Anthropic). Версия v12." should be kept in `docs/auth/overview.md` (or moved to `docs/AUTH_DESIGN.md` index).
- When splitting, each target file should start with a `# Title` heading that matches the topic.
