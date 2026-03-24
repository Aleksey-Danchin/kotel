# Auth Design

Архитектура системы авторизации разбита на отдельные файлы по темам:

- [Обзор и концепция](./auth/overview.md) — о документе, сценарии, известные ограничения
- [OAuth 2.0 flow, PKCE, Deep Links](./auth/oauth-flow.md) — авторизация, маршруты
- [Токены и хранение](./auth/tokens.md) — схема токенов, cookie, SecureStore, clientType
- [Сессии и ротация](./auth/sessions.md) — rotation, reuse detection, refresh, logout
- [Безопасность](./auth/security.md) — fingerprint, режимы настороженности, rate limiting
- [Клиентская часть](./auth/clients.md) — web, expo, стор, деплой
- [Implementation Decisions](./auth/implementation-decisions.md) — конкретные технические решения
