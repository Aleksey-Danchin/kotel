---

## step-imp — 2026-03-23T16:54:15+03:00

**Result**: SUCCESS

### Changed Files
- `apps/backend/src/session/alertness.ts` — добавлен getter режима alertness с валидацией `REUSE_DETECTION_MODE`.
- `apps/backend/src/session/alertness.spec.ts` — добавлены unit-тесты дефолта, валидных и невалидных режимов.
- `apps/backend/src/session/session.service.ts` — добавлена обработка reuse при `markAsUsed === null` и `handleReuseDetection` с режимами debug/isolation/quarantine/lockdown.
- `apps/backend/src/session/session.service.spec.ts` — расширены unit-тесты refresh/reuse и mode-specific поведения.
- `apps/backend/src/session/session.controller.integration.spec.ts` — добавлены интеграционные кейсы unknown/expired/revoked и проверки всех alertness-режимов.
- `infra/compose/dev.yml` — добавлен env `REUSE_DETECTION_MODE` для backend (default `quarantine`).

### Tests
- Task-specific: 34 passed, 0 failed
- Regression: 68 passed, 0 failed

### Acceptance Criteria
- [x] AC-1: valid active refresh token rotates as before — verified by: `session.controller.integration.spec.ts` (WEB/EXPO rotate tests).
- [x] AC-2: used refresh token is treated as reuse — verified by: `session.service.spec.ts` + `session.controller.integration.spec.ts`.
- [x] AC-3: debug mode logs and returns 401 without revocation — verified by: `session.service.spec.ts` + `session.controller.integration.spec.ts`.
- [x] AC-4: isolation mode revokes compromised chain and returns 401 — verified by: `session.service.spec.ts` + `session.controller.integration.spec.ts`.
- [x] AC-5: quarantine mode revokes all user sessions and returns 401 — verified by: `session.service.spec.ts` + `session.controller.integration.spec.ts`.
- [x] AC-6: lockdown mode revokes all user sessions and returns 401 — verified by: `session.service.spec.ts` + `session.controller.integration.spec.ts`.
- [x] AC-7: expired/revoked refresh token returns 401 without reuse handling — verified by: `session.service.spec.ts` + `session.controller.integration.spec.ts`.
- [x] AC-8: unknown token returns 401 — verified by: `session.service.spec.ts` + `session.controller.integration.spec.ts`.
- [x] AC-9: `REUSE_DETECTION_MODE` is respected — verified by: `alertness.spec.ts` + mode-specific integration tests.

### Discoveries
- `scripts/prettier.sh` отсутствует; для форматирования backend в этом шаге использован `npm --prefix apps/backend run format`.
