---

## step-imp — 2026-03-25T19:35:30Z

**Result**: SUCCESS

### Changed Files

- `apps/designer/src/state/headerGear.ts` — сравнение host `serverUrl` с `window.location.host`, роли admin/root.
- `apps/designer/src/state/headerGear.test.ts` — unit-тесты правил шестерёнки.
- `apps/designer/src/state/chatComposerActions.ts` — атом дозаписи сообщений, merge с моками, отправка и автоответ 2000 ms.
- `apps/designer/src/state/chatComposerActions.test.ts` — trim/таймеры.
- `apps/designer/src/components/ColumnHeaderGear.tsx` — кнопка-заглушка с иконкой.
- `apps/designer/src/routes/ChatColumn.tsx` — композер, Enter/Shift+Enter, интеграция отправки.
- `apps/designer/src/routes/ServicesColumn.tsx`, `ChatsColumn.tsx` — шестерёнка в шапке.
- `apps/designer/src/routes/~$id/~index.tsx` — merged messages для списка.

### Tests

- Task-specific: `apps/designer` Vitest 5 files, 16 tests passed.
- Regression: full designer `npm test` passed.

### Acceptance Criteria

- [x] AC-1: композер в футере — верстка flex/col, скролл тела.
- [x] AC-2: Enter / Shift+Enter — `onKeyDown` + `preventDefault`.
- [x] AC-3: whitespace — `trim` в `sendDesignerChatMessage`.
- [x] AC-4: мгновенное исходящее — атом + тест.
- [x] AC-5: автоответ ~2 с — `DESIGNER_CHAT_AUTOREPLY_MS` + fake timers test.
- [x] AC-6: шестерёнка по правилу — компонент + unit-тесты.
- [x] AC-7: клик — `type="button"`, `preventDefault`.

### Discoveries

- Шаг помечал ручную проверку; добавлены автоматические unit-тесты в `apps/designer` (Vitest node), без E2E.
