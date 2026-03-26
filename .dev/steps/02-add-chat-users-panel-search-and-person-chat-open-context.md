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
