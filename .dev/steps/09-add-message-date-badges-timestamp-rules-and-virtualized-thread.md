# Step 09: Add date badges, timestamp formatting rules, and virtualized thread

## Goal
Upgrade message timeline rendering with centered day badges, conditional timestamp formatting, and `@tanstack/react-virtual` virtualization.

## Motivation
Message list readability and performance degrade with long threads; grouping by day and virtualizing rendering are required to avoid UI freezes and improve temporal clarity.

## Type
feature, ui, performance

## Affected Area
`apps/designer/src/components/ChatMessageList.tsx`, `apps/designer/src/routes/ChatColumn.tsx` (scroll container contract), `apps/designer/src/state/chatThreadScrollContext.tsx`, `apps/designer/src/state/chatThreadScrollLogic.ts`, package dependency updates (`apps/designer/package.json`), tests for timestamp/date grouping.

## Dependencies
Depends on steps 01 and 08.

## Current Behavior
`ChatMessageList` renders plain mapped list with per-message timestamp in one fixed format and no day separators. Rendering is non-virtualized and can lag on large threads.

## Expected Behavior
- Message list includes centered DaisyUI badge per day (`26 мар`) before that day's messages.
- Message time format rules:
  - today -> `HH:mm`;
  - current year -> `D MMM HH:mm` (locale output via `Intl.DateTimeFormat`);
  - other years -> include year (locale output, year-first acceptable per formatter result).
- Thread rendering uses `@tanstack/react-virtual` installed via npm.
- Sticky and jump-to-bottom behavior remain compatible after virtualization.

## Specification
- Install and use `@tanstack/react-virtual` in designer app.
- Build a flattened virtual model combining:
  - day badge rows;
  - message rows.
- Badge style: centered DaisyUI badge between message groups.
- Implement timestamp formatter with `Intl.DateTimeFormat` and conditional option sets for the three time contexts.
- Ensure `ChatColumn` scroll element remains the virtualizer scroll parent.
- Adapt scroll notification APIs if needed so unread/sticky logic can still count new incoming messages correctly.
- Preserve existing bubble style and outgoing/incoming alignment.

## Acceptance Criteria
1. Day badge appears once per message date and is centered.
2. Timestamp output follows today/current-year/other-year rules using `Intl.DateTimeFormat`.
3. Long threads render smoothly with virtualization (no visible freeze at several hundred messages).
4. Sticky mode and jump-to-bottom control continue to work with virtualized rows.
5. `@tanstack/react-virtual` is added via npm and used in message list implementation.

## Verification Scenario
1. Open `chat_general` with many messages and scroll through full thread.
2. Verify day badges are inserted correctly between date groups.
3. Validate timestamp examples for today/current-year/older-year messages.
4. Send and receive messages near bottom and away from bottom; verify sticky/unread behavior still works.

## Testing
- Vitest for timestamp formatting and date-group row generation.
- Manual performance smoke with large thread and scroll interactions.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- Keep virtual row key strategy stable to avoid remount flicker during incoming message appends.
