---

## step-imp — 2026-03-24T14:17:53+03:00

**Result**: SUCCESS

### Changed Files
- `docs/scenarios/web-auth/001-add-server-oauth.md` — создан сценарий web-auth с целью, предусловиями, шагами и заметками.
- `docs/scenarios/web-session/001-session-lifecycle.md` — создан сценарий web-session с описанием refresh/logout/logout-all-devices.
- `docs/scenarios/web-setup/001-setup-init.md` — создан сценарий web-setup с ветками инициализированного и неинициализированного сервера.
- `apps/frontend/e2e/auth/oauth-flow.spec.ts` — добавлен комментарий-ссылка на сценарий перед `test(...)`.
- `apps/frontend/e2e/auth/session-lifecycle.spec.ts` — добавлен комментарий-ссылка на сценарий перед `test(...)`.
- `apps/frontend/e2e/auth/setup-flow.spec.ts` — добавлен комментарий-ссылка на сценарий перед `test(...)`.

### Tests
- Task-specific: not required (documentation-only step), 0 failed
- Regression: not required (documentation-only step), 0 failed

### Acceptance Criteria
- [x] AC-1: Создан web-auth сценарий с разделами — verified by: code inspection
- [x] AC-2: Создан web-session сценарий с разделами — verified by: code inspection
- [x] AC-3: Создан web-setup сценарий с разделами — verified by: code inspection
- [x] AC-4: В E2E спеках добавлены комментарии перед test — verified by: code inspection
- [x] AC-5: Пути в комментариях корректны — verified by: code inspection
- [x] AC-6: Логика тестов не изменена — verified by: code inspection

### Discoveries
- В репозитории отсутствует `scripts/prettier.sh`, поэтому фазу `prettier` нужно закрывать как `cancelled` с пояснением.
