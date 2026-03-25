---

## step-imp — 2026-03-25T19:32:00Z

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/routes/~__root.tsx` — viewport shell `h-dvh overflow-hidden`, three columns `h-full min-h-0`, `ChatColumn` wraps `Outlet`
- `apps/designer/src/routes/ChatColumn.tsx` — new flex column shell: header, scroll body, composer footer; `border-l-2` on main chat pane
- `apps/designer/src/routes/ServicesColumn.tsx` — header «Сервера», scroll list, footer «Добавить сервер»
- `apps/designer/src/routes/ChatsColumn.tsx` — header hostname, scroll list, fixed footer slot; removed `border-r`
- `apps/designer/src/routes/~$id/~index.tsx` — message placeholder only (шапка перенесена в `ChatColumn`)

### Tests
- Task-specific: designer `npm test` — 10 passed
- Regression: same suite (full designer unit)

### Acceptance Criteria
- [x] AC-1: no document scroll — `h-dvh overflow-hidden` on root
- [x] AC-2: independent column body scroll — `flex-1 min-h-0 overflow-y-auto` on column mids
- [x] AC-3: fixed headers/footers — `shrink-0` zones per column
- [x] AC-4: server/chats labels and footer slots — implemented
- [x] AC-5: chat border on main container — `ChatColumn` `border-l-2`, chats column border removed
- [x] AC-6: modals/dialogs — `ServicesColumn` dialog unchanged
- [x] AC-7: flexbox layout — spec classes on each column

### Discoveries
- `scripts/prettier.sh` отсутствует в репозитории; форматирование не запускалось этим скриптом.
