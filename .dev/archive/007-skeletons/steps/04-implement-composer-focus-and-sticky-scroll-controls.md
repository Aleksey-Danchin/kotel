# Step 04: Implement Composer Focus And Sticky Scroll Controls

## Goal
Add deterministic focus behavior for chat composer and implement full sticky-scroll UX with “down chat” control and unread-new counter behavior.

## Motivation
Conversation ergonomics are incomplete without reliable input focus and predictable auto-scroll behavior in long threads.

## Type
feature, ui, refactor

## Affected Area
`apps/designer/src/routes/ChatColumn.tsx`, `apps/designer/src/routes/~$id/~index.tsx`, `apps/designer/src/components/ChatMessageList.tsx`, `apps/designer/src/state/chatComposerActions.ts`, and any new UI helper/component for the “вниз чата” control.

## Dependencies
Depends on steps 01, 02, and 03.

## Current Behavior
- Composer textarea does not auto-focus on chat open/switch.
- Messages are not anchored to bottom by default when content is short.
- No sticky-mode tracking for auto-scroll when new messages arrive.
- No “down chat” quick-scroll control or new-message counter when user scrolls up.

## Expected Behavior
- Composer textarea gets focus on every chat switch/open and remains focused after send.
- Message stream is visually bottom-anchored.
- Sticky mode is active when user is near bottom (`threshold 24–32px`).
- In sticky mode, any new message (incoming or outgoing) auto-scrolls to bottom.
- If user scrolls away from bottom, sticky mode turns off.
- Sticky mode re-enables either by:
  - manual scroll back to bottom, or
  - sending own message.
- “Вниз чата” button is visible when sticky is off.
- While “вниз чата” is visible, count only incoming new messages; show counter above button and primary border highlight on the button.
- Counter resets on button click or manual scroll back to bottom.

## Specification
1. Introduce scroll container refs and derived sticky state in chat message body rendering path.
2. Implement threshold-based bottom detection with configurable value in range `24–32px`.
3. Ensure bottom anchoring for message list layout in both short and long threads.
4. Add composer autofocus effects in `ChatColumn`:
   - on selected chat change,
   - after successful send.
5. Track new-message deltas while sticky is off:
   - increment only for incoming messages,
   - do not increment for outgoing messages from session user.
6. Add “вниз чата” control above send button in composer/footer area:
   - visible only when sticky is off,
   - click scrolls to bottom and re-enables sticky.
7. Add badge/counter above control and switch control border to primary when unread-new counter is non-zero.
8. Keep behavior stable with delayed auto-reply from `sendDesignerChatMessage`.

## Acceptance Criteria
1. Opening or switching to any chat autofocuses composer textarea.
2. Sending a message keeps focus in composer.
3. Message area is bottom-anchored in visual resting state.
4. In sticky mode, incoming and outgoing new messages auto-scroll to bottom.
5. Scrolling up disables sticky and reveals “вниз чата”.
6. Incoming messages while sticky is off increase visible counter and primary border highlight.
7. Clicking “вниз чата” or manual return to bottom clears counter and hides control.
8. Sending own message while sticky is off re-enables sticky behavior.

## Verification Scenario
1. Open `http://localhost:5173/` via MCP `cursor-ide-browser`.
2. Open a chat and verify textarea is focused immediately.
3. Send a message with Enter; verify focus remains in textarea.
4. Scroll up in a long chat; verify “вниз чата” appears.
5. Wait for auto-reply; verify counter increments and control border becomes primary.
6. Click “вниз чата”; verify scroll jumps to bottom, counter resets, control hides.
7. Scroll up again and send own message; verify sticky is restored and list scrolls down.

## Testing
Manual verification via MCP `cursor-ide-browser` on `http://localhost:5173/`.  
No automated test additions in this scope.

<CORRECTION by="step-executor" reason="project Vitest policy">
Added `apps/designer/src/state/chatThreadScrollLogic.test.ts` for threshold helpers; designer suite run via `docker exec kris-frontend-test` with `cd /apps/designer`.
</CORRECTION>

## Notes
- Keep scroll logic encapsulated to avoid coupling shell layout with message rendering internals.
- Ensure counter logic is based on message direction (`author !== sessionUserId` for incoming).
