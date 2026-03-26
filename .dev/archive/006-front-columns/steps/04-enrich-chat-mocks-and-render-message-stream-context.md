---

## step-imp — 2026-03-25T19:35:00.000Z

**Result**: SUCCESS

### Changed Files

- `apps/designer/src/state/mocks.json` — полные треды для всех чатов, `chat_general` ×48 для скролла, роль `root` у основного сервера, чат `chat_design` как `person` с `peerName`.
- `apps/designer/src/state/store.ts` — `ChatType`, `peerName`, `chatHeaderTitle`, комментарии к `ChatMessage`, сортировка `getChatMessages` по `createdAt`.
- `apps/designer/src/components/ChatCard.tsx`, `apps/designer/src/routes/ChatColumn.tsx` — заголовок карточки/шапки через `chatHeaderTitle`.
- `apps/designer/src/components/ChatMessageList.tsx`, `apps/designer/src/components/ChatMessageBodySkeleton.tsx` — список сообщений и скелетон.
- `apps/designer/src/routes/~$id/~index.tsx` — загрузка 420ms при смене серер/чата, рендер `ChatMessageList`.
- `.dev/progress.json` — исправление статусов прогресса шага 4 после ошибочного batch `progress-update`.

### Tests

- Task-specific: нет (по шагу — только ручная проверка в UI).
- Regression: нет.
- Сборка: `npm run build` в `apps/designer` — успех.

### Acceptance Criteria

- [x] AC-1: у каждого чата есть сообщения — проверка: скрипт по `mocks.json`, пустой список отсутствующих чатов.
- [x] AC-2: длинный тред — `chat_general`, 48 сообщений.
- [x] AC-3: шапка личного чата — `chat_design` + `chatHeaderTitle` / `peerName`.
- [x] AC-4: исходящие/входящие — классы `bg-primary/15` vs `bg-base-200/90` в `ChatMessageList`.
- [x] AC-5: скелетон при смене `selectedServer`/`selectedChat` в `~index.tsx`.
- [x] AC-6: заглушка текста убрана — список или скелетон.

### Discoveries

- `docker compose -f infra/compose/dev.yml ps` требует `PROJECT_ROOT` и прочих переменных из `.env`; быстрая проверка здоровья: `docker ps` по именам `kotel-*`.
