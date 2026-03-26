# Step 03: Refine Empty States And Column Visuals

## Goal
Normalize column shell visuals (header height/background/borders) and implement requested empty-state rendering for no-chat and no-message scenarios.

## Motivation
Current shell still has visual inconsistencies and incomplete empty-state behavior compared to requested UX.

## Type
ui, refactor

## Affected Area
`apps/designer/src/routes/~__root.tsx`, `apps/designer/src/routes/ServicesColumn.tsx`, `apps/designer/src/routes/ChatsColumn.tsx`, `apps/designer/src/routes/ChatColumn.tsx`, `apps/designer/src/components/ChatMessageList.tsx`, and potentially shared header UI component(s).

## Dependencies
Depends on steps 01 and 02.

## Current Behavior
- Right chat column is not fully empty in no-chat state because shell header/footer placeholders remain.
- Header heights differ between three columns.
- Third-column right border is not explicitly visible on root wrapper.
- Column backgrounds are close in tone and may visually merge.
- No-chats/no-messages wording is not aligned to requested exact labels.

## Expected Behavior
- When no chat is selected, main right column is fully empty (no header/footer/placeholder text).
- Unified header height for all three columns (including gear button space), using fixed min-height and consistent paddings.
- Distinct column background tokens for clearer separation.
- Explicit right border on third-column wrapper in root layout.
- Chats-empty state label: `Чатов нет`.
- Empty-message state label for existing chat with no messages: `Сообщений нет`.

## Specification
1. In shell composition, gate chat-column header/footer by selected chat existence so no-chat state renders a fully empty main area.
2. Standardize header classes across `ServicesColumn`, `ChatsColumn`, and chat header:
   - enforce common `min-h-*` (target from Q&A: `min-h-12`),
   - use consistent vertical rhythm and gear inclusion.
3. Adjust DaisyUI background tokens to increase contrast between columns without introducing custom palette logic.
4. Add explicit right border at root third-column wrapper level in `~__root.tsx`.
5. Ensure chats-column empty state uses exact text `Чатов нет`.
6. Ensure message list empty state uses exact text `Сообщений нет` for selected chat without messages.

## Acceptance Criteria
1. With no selected chat, the right main area is visually empty (no chat header/footer/composer).
2. All three column headers share equal visible height.
3. Third column has a clearly visible right border.
4. Column backgrounds are visually distinguishable in active theme.
5. Server without chats shows `Чатов нет`.
6. Empty chat (existing chat with zero messages) shows `Сообщений нет`.

## Verification Scenario
1. Open `http://localhost:5173/` via MCP `cursor-ide-browser`.
2. Navigate to state with selected server but no selected chat; verify fully empty main area.
3. Compare three column headers and verify equal height including gear slot.
4. Confirm right border is visible on outer edge of third column.
5. Select server without chats and verify `Чатов нет` in chats column.
6. Select empty chat in `srv_main` and verify `Сообщений нет` in message body.

## Testing
Manual verification via MCP `cursor-ide-browser` on `http://localhost:5173/`.  
No automated test additions in this scope.

## Notes
- Keep structural changes compatible with fixed-shell behavior from prior steps.
- Avoid reintroducing global page scroll while changing shell containers.
