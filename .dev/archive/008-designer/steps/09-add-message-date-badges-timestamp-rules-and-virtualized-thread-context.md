---

## step-imp — 2026-03-26T14:06:51+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/components/ChatMessageList.tsx` — switched thread rendering to virtualized rows with day-badge/message flattening and preserved message bubble styles.
- `apps/designer/src/state/chatMessageTimeline.ts` — added timeline row builder and conditional `Intl.DateTimeFormat` timestamp rules (today/current-year/other-year).
- `apps/designer/src/state/chatMessageTimeline.test.ts` — added tests for timestamp formatting and day-group row generation.
- `apps/designer/src/routes/ChatColumn.tsx` — exposed chat scroll container getter to virtualizer via scroll context API.
- `apps/designer/src/state/chatThreadScrollContext.tsx` — extended context contract with `getScrollElement`.
- `apps/designer/package.json` — added `@tanstack/react-virtual` dependency.
- `apps/designer/package-lock.json` — lockfile updated for new dependency.

### Tests
- Task-specific: 6 passed, 0 failed (`chatMessageTimeline`, `chatThreadScrollLogic`).
- Regression: 50 passed, 0 failed (`apps/designer` full Vitest suite).

### Acceptance Criteria
- [x] AC-1: centered day badge appears once per date group — verified by: `buildChatTimelineRows` unit test + `ChatMessageList` rendering logic.
- [x] AC-2: timestamp formatting for today/current-year/other-year via Intl — verified by: `formatMessageTimestamp` unit tests.
- [x] AC-3: long threads render smoothly with virtualization — verified by: `@tanstack/react-virtual` integration in `ChatMessageList`.
- [x] AC-4: sticky mode and jump-to-bottom still work — verified by: preserved `ChatColumn` sticky/unread logic and scroll parent wiring through context.
- [x] AC-5: tanstack react-virtual added and used — verified by: dependency install and virtualizer usage in message list.

### Discoveries
- `scripts/prettier.sh` is absent in this repository, so formatting phase cannot use that script.

---

## step-imp — 2026-03-26T15:15:17+03:00

**Result**: SUCCESS

### Changed Files
- `apps/designer/src/components/ChatMessageList.tsx` — re-introduced `@tanstack/react-virtual` list rendering with stable virtual keys and preserved day-badge/message row UI.

### Tests
- Task-specific: 6 passed, 0 failed (`src/state/chatMessageTimeline.test.ts`, `src/state/chatThreadScrollLogic.test.ts`).
- Regression: 51 passed, 0 failed (`apps/designer` full Vitest suite).

### Acceptance Criteria
- [x] AC-1: day badge appears once per date group and is centered — verified by: `buildChatTimelineRows` unit test + browser screenshots from `http://localhost:5173/chat_general`.
- [x] AC-2: timestamp formatting rules (today/current-year/other-year) via `Intl.DateTimeFormat` — verified by: `formatMessageTimestamp` unit tests + browser timestamps (`25 мар., HH:mm` format in thread).
- [x] AC-3: long threads smooth with virtualization — verified by: `useVirtualizer` integration in `ChatMessageList` and browser scroll through long `chat_general`.
- [x] AC-4: sticky mode and jump-to-bottom work with virtual rows — verified by: browser scenario showing floating jump-to-bottom button while scrolled away from bottom.
- [x] AC-5: `@tanstack/react-virtual` installed and used — verified by: dependency in `apps/designer/package.json` and active import/use in `ChatMessageList`.

### Discoveries
- Browser validation for this step runs against `http://localhost:5173` (designer Vite), independent from Docker dev frontend at `kotel-*.localhost`.
