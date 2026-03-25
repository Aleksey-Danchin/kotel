# Step 05: Add Composer Autoreply And Header Gear Rules

## Goal
Implement chat message input flow (textarea + send button + Enter behavior + delayed mock reply) and add conditional gear icon in all column headers based on server/role rule.

## Motivation
The interaction loop is incomplete without message sending, and the requested admin/root header affordance must be represented consistently across the new fixed shell.

## Type
feature, ui

## Affected Area
Chat column component/shell, chat body and footer components, state update actions in `apps/designer/src/state/store.ts`, header components in server/chats/chat columns, mock role data from `apps/designer/src/state/mocks.json`.

## Dependencies
Depends on step 04.

## Current Behavior
No composer exists in chat footer, no message submit UX, no delayed echo reply, and no gear icon logic in headers tied to selected server and current user role.

## Expected Behavior
Composer behavior:
- Footer contains textarea and send button.
- `Enter` sends message.
- `Shift+Enter` inserts newline.
- Input is `trim`-processed before send.
- Empty (after trim) payload is ignored.
- On send, local mock state is updated immediately with outgoing message.
- Around 2 seconds later, an incoming auto-reply is appended with duplicated text.

Header gear behavior:
- Each column header can render a gear button placeholder.
- Gear is visible only when:
  - selected server matches current web client address via original `serverUrl` comparison rule (for example by comparing parsed `serverUrl` `hostname`/`host` against current `window.location` values),
  - selected user role is `admin` or `root` (case-insensitive).
- Gear click has no action for now.

## Specification
1. Add footer composer UI to chat column shell (from step 03) and wire submit handling, preserving flex-based column split (`header/footer = shrink-0`, `body = flex-1 min-h-0 overflow-y-auto`).
2. Implement input key handling:
   - prevent default Enter submit in textarea when `!shiftKey`,
   - preserve newline on `Shift+Enter`.
3. Add message append action(s) in store for per-chat updates:
   - create new message id/timestamp,
   - append to chat message links,
   - maintain order by created time.
4. Implement delayed auto-reply scheduler (~2000 ms) that duplicates sent text as incoming message.
5. Implement reusable header action rendering helper for all three headers:
   - evaluate selected server URL vs client address using `serverUrl` (not route `serverId` dot-format),
   - evaluate role with case-insensitive `admin|root`.
6. Keep behavior resilient when no server/chat is selected (composer disabled or hidden as appropriate).

## Acceptance Criteria
1. Composer is present in chat footer and remains fixed while message list scrolls.
2. Enter submits, Shift+Enter adds newline.
3. Whitespace-only message is not submitted.
4. Sent message appears immediately in current chat.
5. Auto-reply appears approximately 2 seconds later with duplicated text.
6. Gear icon appears in all headers only when server/role rule is satisfied; otherwise hidden.
7. Clicking gear does not trigger navigation/errors.

## Verification Scenario
1. Open a person chat and type multiline text using Shift+Enter.
2. Press Enter and verify immediate outgoing message appears.
3. Wait ~2 seconds and verify incoming duplicate reply appears.
4. Send whitespace-only text and verify no new message appears.
5. Select server/session matching local web client + admin/root role and verify gears in all three headers.
6. Switch to non-matching server or non-admin/root role and verify gears disappear.

## Testing
Manual-only checks for composer and header rules.  
Automated E2E tests are intentionally out of scope for this suggestion cycle.

## Notes
- Architectural risk to track: route parsing, selection persistence, and mutable mock message graph are currently coupled; consider consolidating transitions and chat mutations behind explicit store actions to simplify future frontend migration.
- Keep this refactor-level observation in implementation notes, as requested, without creating separate audit-only deliverables.
