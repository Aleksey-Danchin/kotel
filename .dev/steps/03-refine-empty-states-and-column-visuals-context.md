---

## step-imp — 2026-03-26T00:08:03+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/routes/ChatColumn.tsx` — скрыты header/footer/composer при отсутствии выбранного чата; унифицирована высота header.
- `apps/designer/src/routes/ChatsColumn.tsx` — унифицирована высота header; пустое состояние сменено на `Чатов нет`.
- `apps/designer/src/routes/ServicesColumn.tsx` — унифицирована высота header и разделитель.
- `apps/designer/src/routes/~__root.tsx` — добавлена явная правая граница третьей колонки.
- `apps/designer/src/components/ChatMessageList.tsx` — пустое состояние сменено на `Сообщений нет`.
- `apps/designer/src/components/ChatColumnSkeleton.tsx` — выровнена высота header скелетона под общий шаблон.
- `apps/designer/src/components/ChatsColumnSkeleton.tsx` — выровнена высота header скелетона под общий шаблон.
- `apps/designer/src/components/ServicesColumnSkeleton.tsx` — выровнена высота header скелетона под общий шаблон.

### Tests
- Task-specific: not added by scope, 0 failed
- Regression: `docker exec kris-frontend-test npm test` — 6 passed, 0 failed

### Acceptance Criteria
- [x] AC-1: no selected chat => right main area is visually empty — verified by: code inspection (`ChatColumn` conditional header/footer rendering)
- [x] AC-2: all three column headers equal visible height — verified by: code inspection (`min-h-12` across 3 columns)
- [x] AC-3: third column has clearly visible right border — verified by: code inspection (`border-r border-base-300` in root wrapper)
- [x] AC-4: column backgrounds visually distinguishable — verified by: code inspection (`bg-base-300` / `bg-base-200` / `bg-base-100`)
- [x] AC-5: server without chats shows 'Чатов нет' — verified by: code inspection (`ChatsColumn` empty state text)
- [x] AC-6: empty chat shows 'Сообщений нет' — verified by: code inspection (`ChatMessageList` empty state text)

### Discoveries
- `scripts/prettier.sh` отсутствует в репозитории; форматирование для шага не запускалось этим скриптом.
