# Step 03: Build Fixed Three-Column Shell

## Goal
Restructure designer chat layout into three fixed-height columns with dedicated header/body/footer zones and per-column internal scrolling, while removing global page scroll, with the column structure implemented via Flexbox.

## Motivation
Requested UX requires desktop-messenger-like behavior: static shell, independent scroll regions, and predictable action placement in each column.

## Type
ui, refactor

## Affected Area
`apps/designer/src/routes/~__root.tsx`, `apps/designer/src/routes/ServicesColumn.tsx`, `apps/designer/src/routes/ChatsColumn.tsx`, new `apps/designer/src/routes/ChatColumn.tsx` (or equivalent), style classes in related components.

## Dependencies
Depends on step 01 and step 02.

## Current Behavior
Layout uses `min-h-screen` wrappers with mixed scroll behavior and no strict `header / scroll-body / footer` partitions. Chat column border is currently on `ChatsColumn` aside instead of main chat container.

## Expected Behavior
- Page itself does not scroll.
- Each of the three columns can scroll only inside its middle content region.
- Every column has fixed header and fixed footer areas.
- Fixed header/footer and scrollable body are implemented through Flexbox column layout (`flex flex-col`) for each column.
- Servers column header: `"Сервера"`.
- Servers column footer: `"Добавить сервер"` button.
- Chats column header: selected server name.
- Chats column footer: fixed footer zone (can be empty placeholder in this step, but layout slot must exist and stay fixed).
- Chat column header: peer name for `person`, title for `group`.
- Chat column footer: message composer form.
- Visible right border must be applied to main chat column container in root shell; old chat-column border placement is removed.

## Specification
1. Replace current root structure with strict viewport container:
   - outer wrapper with full viewport height and `overflow-hidden`,
   - three fixed-width/flexible columns in a single row.
2. For each column, implement three zones:
   - use Flexbox (`flex flex-col h-full min-h-0`) as mandatory layout mechanism,
   - header: `shrink-0`,
   - body: `min-h-0 flex-1 overflow-y-auto`,
   - footer: `shrink-0`.
   - do not rely on `position: sticky` as primary mechanics for this requirement.
3. Create dedicated chat column shell component (as requested) and mount it from `~__root.tsx`.
4. Move chat-area visual separator:
   - remove `border-r` from `ChatsColumn` root `aside`,
   - add a stronger, theme-visible border on main chat column container in root/chat-shell.
5. Keep existing dialogs and controls functional in the new fixed layout.

## Acceptance Criteria
1. Scrolling mouse wheel over page background does not scroll the whole document.
2. Server list, chat list, and message list scroll independently when content exceeds height.
3. Each of the three columns visibly shows fixed header and footer.
4. Server column header/footer render required content labels/actions; chats column has fixed header and fixed footer slot.
5. Chat-column border appears on main chat container, not on chats list column.
6. No clipping/regression for existing modal and controls after layout refactor.
7. Column internals are built using Flexbox (`flex-col` with `shrink-0` header/footer and `flex-1 min-h-0 overflow-y-auto` body).

## Verification Scenario
1. Open designer root page and inspect viewport behavior while scrolling outside column bodies.
2. Add enough servers/chats/messages to force overflow in each column.
3. Verify only middle content areas scroll.
4. Confirm headers and footers remain fixed while body scrolls.
5. Verify border is on main chat column container and visually distinct in current DaisyUI theme.

## Testing
Manual UI verification only.  
No automated tests are required in this scope.

## Notes
- Keep shell composition simple and reusable; route pages should not be responsible for global layout mechanics.
- This step prepares structure for message rendering/loading/composer behavior in following steps.
