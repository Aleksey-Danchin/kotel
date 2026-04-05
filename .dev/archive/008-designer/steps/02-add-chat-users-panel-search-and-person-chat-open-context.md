---

## step-imp — 2026-03-26T10:34:35Z

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/routes/ChatsColumn.tsx` — добавлены debounced-поиск, clear-кнопка, блок пользователей и открытие/создание DM по клику на пользователя.
- `apps/designer/src/state/store.ts` — добавлен детерминированный `findOrCreatePersonChat` с реестром `(serverId, peerUserId) -> chatId`.
- `apps/designer/src/components/UserCard.tsx` — добавлена карточка пользователя (имя, онлайн-индикатор, lastSeen).
- `apps/designer/src/state/chatSearch.ts` — добавлен token-order-independent матчинг поиска по строке.
- `apps/designer/src/state/chatSearch.test.ts` — тесты токенизации и поиска.
- `apps/designer/src/state/store.test.ts` — тест детерминированного создания/повторного открытия личного чата.

### Tests
- Task-specific: 4 passed, 0 failed (`npx vitest run src/state/chatSearch.test.ts src/state/store.test.ts` в `apps/designer`)
- Regression: 22 passed, 0 failed (`npm test` в `apps/designer`)

### Acceptance Criteria
- [x] AC-1: chat column shows chats and users sections — verified by: code inspection + `apps/designer` build.
- [x] AC-2: 250ms debounce and token-order search rules — verified by: code inspection (debounce in `ChatsColumn`) + unit tests (`chatSearch.test.ts`).
- [x] AC-3: clear button visibility and reset behavior — verified by: code inspection.
- [x] AC-4: user click opens or creates deterministic DM — verified by: unit test (`store.test.ts`) + code inspection wiring in `ChatsColumn`.
- [x] AC-5: current session user excluded from users list — verified by: existing `usersForSelectedServerAtom` filtering in `store.ts` + code inspection.

### Discoveries
- В этом репозитории `scripts/prettier.sh` отсутствует, поэтому форматирование выполнялось штатным форматированием в процессе редактирования и проверкой через `npm run build`/`npm test` для `apps/designer`.

---

## step-imp — 2026-03-26T11:36:18Z

**Result**: SUCCESS

### Changed Files
- none — выполнена повторная валидация шага без дополнительных правок кода.

### Tests
- Task-specific: 8 passed, 0 failed (`npx vitest run src/state/chatSearch.test.ts src/state/store.test.ts` в `apps/designer`)
- Regression: 50 passed, 0 failed (`npm test` в `apps/designer`)

### Acceptance Criteria
- [x] AC-1: chat column shows chats and users sections — verified by: browser validation (виден заголовок `Пользователи` и список пользователей в `http://localhost:5173/chat_general`).
- [x] AC-2: 250ms debounce and token-order search rules — verified by: unit tests (`chatSearch.test.ts`) + browser validation (запрос `кол back` оставляет релевантного пользователя).
- [x] AC-3: clear button visibility and reset behavior — verified by: browser validation (`Очистить поиск` появляется для непустого ввода и скрывается после очистки, список восстанавливается).
- [x] AC-4: user click opens or creates deterministic DM — verified by: unit test (`store.test.ts`) + browser validation (повторный клик по `EU Operator` открывает тот же URL `chat_person_srv_main_mock-user-2_1a218730-ce2e-43c3-b43a-46ca9a1642e5`).
- [x] AC-5: current session user excluded from users list — verified by: code inspection (`usersForSelectedServerAtom` фильтрует `selectedServer.user.id`) + browser validation (текущий пользователь отсутствует в блоке `Пользователи`).

### Discoveries
- Для проверки health dev-compose требуется загрузка env (`source .env`) перед `docker compose ... ps`, иначе compose падает на обязательных переменных окружения.
