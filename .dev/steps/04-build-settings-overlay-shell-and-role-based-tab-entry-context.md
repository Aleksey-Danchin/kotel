---

## step-imp — 2026-03-26T13:43:33+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/state/headerGear.ts` — убран предикат видимости шестеренки; оставлены role/host helpers для правил доступа.
- `apps/designer/src/state/settingsOverlay.ts` — добавлены атомы overlay-состояния, маппинг source->initial tab и role/scope resolver доступных вкладок.
- `apps/designer/src/components/ColumnHeaderGear.tsx` — кнопка всегда рендерится, принимает `source` и открывает settings overlay с корректной стартовой вкладкой.
- `apps/designer/src/components/SettingsOverlay.tsx` — реализована полноэкранная shell-оверлей панель с табами, кнопкой закрытия и синхронизацией active tab с доступными вкладками.
- `apps/designer/src/routes/ServicesColumn.tsx` — передан `source="services"` в gear.
- `apps/designer/src/routes/ChatsColumn.tsx` — передан `source="chats"` в gear.
- `apps/designer/src/routes/ChatColumn.tsx` — передан `source="chat"` в gear.
- `apps/designer/src/routes/~__root.tsx` — оверлей отрисован поверх root-контейнера; Esc в приоритете закрывает settings и подавляет штатную цепочку навигации.
- `apps/designer/src/state/headerGear.test.ts` — тесты обновлены под новую ответственность модуля.
- `apps/designer/src/state/settingsOverlay.test.ts` — добавлены unit-тесты для source mapping и role/scope tab access.

### Tests
- Task-specific: 6 passed, 0 failed (`src/state/headerGear.test.ts`, `src/state/settingsOverlay.test.ts`).
- Regression: 27 passed, 0 failed (`npm test` в `apps/designer`).

### Acceptance Criteria
- [x] AC-1: all three headers always show clickable gear — verified by: code inspection (`ColumnHeaderGear` always renders, three sources wired in columns).
- [x] AC-2: each gear opens settings with correct initial tab — verified by: unit test `initialSettingsTabForSource` + click handler wiring.
- [x] AC-3: non-root/admin restricted to account tab — verified by: unit test `resolveSettingsTabsForSession`.
- [x] AC-4: root/admin current server gets all tabs, non-current restricted — verified by: unit test `resolveSettingsTabsForSession`.
- [x] AC-5: Esc closes settings before existing navigation — verified by: code inspection in root keydown handler with early return when overlay open.

### Discoveries
- `scripts/prettier.sh` отсутствует в репозитории; отдельный этап prettier в step-queue отмечен как cancelled.
