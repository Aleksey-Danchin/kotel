# Step 08: Fix last-chat restore, composer limits, and sticky retention

## Goal
Fix server-switch restoration of last active chat and implement chat composer constraints (1024 max, counter, autosize 2..10 rows) with robust sticky behavior.

## Motivation
Current interaction has usability regressions: last active chat is not reliably restored per server, composer is unconstrained, and sticky mode can drop unexpectedly.

## Type
bugfix, ui

## Affected Area
`apps/designer/src/state/store.ts`, `apps/designer/src/state/designerNavigation.ts`, `apps/designer/src/routes/~$id/~index.tsx`, `apps/designer/src/routes/ChatColumn.tsx`, `apps/designer/src/state/chatThreadScrollLogic.ts`, related tests (`designerNavigation.test.ts`, chat scroll/composer tests).

## Dependencies
Depends on step 01.

## Current Behavior
- Last chat may not restore when moving `serverA chat -> serverB -> serverA` without explicit chat exit.
- Composer has no max length, no remaining counter, and allows free resize behavior.
- Sticky mode may turn off around message growth timing even when user has not intentionally left bottom.

## Expected Behavior
- Last active chat per server restores when returning to server if user did not explicitly exit chat on that server.
- Composer enforces 1024 hard limit, shows `осталось N` only when `N <= 50`, and reserves vertical space for counter to prevent layout jump.
- Composer autosizes from 2 to 10 rows, then becomes internally scrollable.
- Sticky mode remains active in all new-message scenarios when sticky is true, using pre/post scroll stabilization.

## Specification
- Last-chat restore fix:
  - audit update/cleanup timing between `applyLastChatCleanupOnPathnameChange`, route resolution, and server switching;
  - ensure cleanup only runs on explicit chat leave semantics, not on server switch that should preserve chat memory.
- Composer constraints:
  - use `maxLength={1024}` on textarea;
  - counter area always reserved in layout; text visible only when remaining <= 50;
  - counter turns error style at 0.
- Autosize behavior:
  - keep initial 2-row height;
  - grow with content up to 10 rows;
  - after 10 rows, textarea scrolls.
- Sticky retention:
  - when sticky=true and new messages appear, apply confirmed sequence:
    1) scroll to bottom before append/render impact,
    2) apply update,
    3) scroll to bottom again after layout settle;
  - apply this to all message-arrival scenarios (initial load, transitions, outgoing, incoming).

## Acceptance Criteria
1. Returning to previously visited server restores last chat unless chat was explicitly exited there.
2. Composer does not accept more than 1024 characters.
3. Remaining counter appears only in last 50 chars and has reserved space preventing footer jump.
4. Textarea autosizes between 2 and 10 rows and scrolls internally after max height.
5. Sticky remains active across all message-add scenarios when user is still in sticky mode.

## Verification Scenario
1. Open `serverA` chat, switch to `serverB`, then back to `serverA`; verify previous chat reopens.
2. Explicitly exit chat with Esc on server and return; verify no auto-open in that server.
3. Paste long text >1024 and verify truncation at limit.
4. Type to threshold and verify counter behavior and non-jumping layout.
5. While sticky is on, trigger incoming/outgoing/transition updates and verify viewport remains pinned to bottom.

## Testing
- Vitest:
  - navigation/state tests for last-chat cleanup vs restore scenarios;
  - composer behavior tests for max length and counter threshold;
  - sticky logic tests for near-bottom retention across updates.
- Manual UI checks for autosize and Esc flows.
- Browser validation must be executed via MCP `cursor-ide-browser` at `http://localhost:5173`; keep a 1-second delay between each interaction step and the following analysis/check so the page can load and react.

## Notes
- Keep existing Esc semantics from settings overlay step: settings-close takes priority only when overlay is open.
