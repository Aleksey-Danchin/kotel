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
