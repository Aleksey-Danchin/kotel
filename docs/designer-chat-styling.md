# Designer chat shell — layout and styling contract

This document codifies the **accepted** structure and visual patterns for the three-column chat shell in `apps/designer`. When chat UI is implemented or migrated in `apps/frontend`, preserve this contract unless a product decision explicitly changes it (update this file and `.cursor/rules` in the same change).

## Shell and scrolling

- The root shell uses a **fixed viewport height** and **suppresses page-level scrolling** (`h-dvh` + `overflow-hidden` on the outer wrappers in `~__root.tsx`).
- Horizontal layout: three columns inside a flex row; the main chat column is `flex-1` with `min-w-0` so the flex child can shrink and the inner scroll regions work.
- **Scroll ownership**: only column **bodies** scroll (`overflow-y-auto`), not the page.

## Per-column flex structure (mandatory)

Each column is a **flex column** that fills available height:

| Zone   | Role        | Tailwind pattern                                      |
|--------|-------------|--------------------------------------------------------|
| Header | Fixed       | `shrink-0`                                             |
| Body   | Scrollable  | `flex-1 min-h-0 overflow-y-auto`                       |
| Footer | Fixed       | `shrink-0` (use an empty footer where no UI is needed) |

Column wrapper: `flex h-full min-h-0 … flex-col` (and width utilities as appropriate).

`min-h-0` on flex children is required so nested flex layouts allow the middle section to shrink and scroll instead of overflowing the viewport.

Primary layout mechanism is **Flexbox**, not sticky positioning, for this shell.

## Borders and separation

- **Between columns**: the services (first) column carries a **right border** on its outer shell (`border-r`). The chat (third) column carries a **left accent border** on its outer shell (`border-l-2` with a subtle base-content tone). Keeps dividers on column containers, not duplicated on every inner block.
- **Within a column**: header/footer often use `border-b` / `border-t` with `border-base-300` for separation from the scrollable list or composer (see `ChatsColumn`, `ChatColumn`).

## Message list visual hierarchy

- **Outgoing** (author equals session user): align end; bubble uses primary-tinted background and border (`bg-primary/15`, `border-primary/20`).
- **Incoming**: align start; bubble uses neutral surface (`bg-base-200/90`, `border-base-300/80`).
- Bubbles: `rounded-box`, light `shadow-sm`, timestamp in muted smaller text.

## Chat column composer

- The message composer lives in a **fixed footer** (`shrink-0`) below the scrollable message area, with top border and padding so it stays visible while the thread scrolls.

## Chat column — fixed-width thread inside full-width column

- The chat column shell stays **full width** of its parent (`flex-1 min-w-0`), but the **message thread and composer** share a single centered content column. Ширина и смещение пузырей задаются **пикселями в `className`** в `ChatColumn.tsx` (`max-w-[…px]` на контейнере треда/футера) и в `ChatMessageList.tsx` (`max-w-[min(100%,…px)]`, `ms-[…px]` / `me-[…px]` — числа синхронизируйте вручную).
- **Scroll ownership** stays on the column body only: the scroll container is **full width** so the **scrollbar sits on the right edge of the chat column**, not on the edge of the narrow thread. Horizontal padding for the thread lives **inside** that main block (`px-3`), not on the scroll root (no lateral padding on the element that owns `overflow-y-auto`), so the track stays flush with the column.

## Related rules

- `.cursor/rules/designer.mdc` — applies these constraints under `apps/designer/**`.
- `.cursor/rules/frontend.mdc` — migration parity for `apps/frontend/**`.
