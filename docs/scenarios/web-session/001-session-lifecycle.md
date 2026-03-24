# Scenario 001: Жизненный цикл сессии — refresh, logout, logout all devices

**Client:** web  
**Automated test:** `apps/frontend/e2e/auth/session-lifecycle.spec.ts`

## Goal

Пользователь обновляет сессию, выполняет logout с текущего устройства и logout со всех устройств, после чего проверяет инвалидирование сессии в другом контексте.

## Preconditions

- Пользователь авторизован на основном сервере, карточка сервера отображается на странице `/session-test`.

## Steps

1. На карточке сервера нажать "Force refresh".
2. Нажать "Check status" и убедиться, что отображается `sessionId`.
3. Открыть второй браузерный контекст (второе устройство) и авторизоваться на том же сервере.
4. Убедиться, что во втором контексте `GET /api/session/status` возвращает `200`.
5. В первом контексте нажать "Logout all devices".
6. Проверить, что карточка сервера исчезла в первом контексте.
7. Проверить, что во втором контексте `GET /api/session/status` возвращает `401`.
8. В первом контексте заново войти через OAuth.
9. На карточке нажать "Logout" (single device).
10. Проверить, что карточка исчезла и `GET /api/session/status` возвращает `401`.

## Notes

- "Force refresh" вызывает `POST /api/session/refresh` и ротирует refresh token.
- "Logout all devices" отзывает все сессии пользователя на выбранном сервере.
- Связанная документация: `docs/auth/sessions.md`.
