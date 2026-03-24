---

## step-imp — 2026-03-23T17:35:16+03:00

**Result**: SUCCESS

### Changed Files
- `apps/prisma/seed/users.seed.ts` — добавлена явная выдача ролей ROOT/ADMIN/USER для `user1`, `user2-4`, `user5-100` и обновлены fullname-шаблоны.

### Tests
- Task-specific: seed выполнен успешно в test DB, SQL-проверки ролей пройдены, 0 failed.
- Regression: `docker exec kris-backend-test npm test` имеет pre-existing failures (5 файлов / 29 тестов) в `src/session/session.guard.integration.spec.ts` и `src/setup/setup.controller.integration.spec.ts`, не связаны с изменением seed.

### Acceptance Criteria
- [x] AC-1: user1 имеет роль ROOT — verified by: SQL query against test DB after seed.
- [x] AC-2: user2-4 имеют роль ADMIN — verified by: SQL query against test DB after seed.
- [x] AC-3: user5-100 имеют роль USER — verified by: SQL query + role distribution count.
- [x] AC-4: seed выполняется без ошибок — verified by: `npx prisma db seed` in `kris-prisma-studio-test`.

### Discoveries
- Для `infra/compose/test.yml` нужен `PROJECT_ROOT`; без него `docker compose` падает на интерполяции volume-путей.
