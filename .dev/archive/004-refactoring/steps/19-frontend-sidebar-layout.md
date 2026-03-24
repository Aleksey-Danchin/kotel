# Step 19: Frontend — sidebar and layout integration

## Goal
Create the sidebar component showing connected servers and integrate it into the root layout as the primary navigation element.

## Motivation
The multi-server architecture needs a way for users to see all connected servers, switch between them, add new ones, and disconnect. The sidebar is the central navigation pattern for this.

## Type
feature, ui

## Affected Area
- `apps/frontend/src/components/sidebar.tsx` — new component
- `apps/frontend/src/routes/__root.tsx` or root layout — wrap with sidebar layout
- `apps/frontend/src/main.tsx` — may need layout adjustment

## Dependencies
Depends on Step 16 (multi-server store, addServer/removeServer functions).

## Current Behavior
No sidebar. No server navigation. The app has a flat layout without server context.

## Expected Behavior

### Sidebar component (`components/sidebar.tsx`)

Left-side panel, always visible:

- **Server list**: each connected server shows:
  - Server URL (truncated to hostname)
  - User fullname
  - Role badge (ROOT/ADMIN/USER) — DaisyUI `badge`
  - Active server highlighted with different background
  - Click to switch active server

- **"Add server" button** at the bottom:
  - Shows a small input for server URL
  - On submit: calls `addServer(url)` → opens OAuth popup

- **"Disconnect" button** per server (hover or swipe):
  - Calls logout + `removeServer(url)`

- **Empty state** (no servers): prompt to add first server

### Layout integration

Wrap the app content in a two-column layout:
```
┌──────────┬────────────────────┐
│ Sidebar  │   Main content     │
│ (fixed)  │   (fluid)          │
│          │                    │
│ server1  │   <Outlet />       │
│ server2  │                    │
│          │                    │
│ [+ Add]  │                    │
└──────────┴────────────────────┘
```

Use DaisyUI `drawer` component or a simple flex layout.

### Styling

DaisyUI + Tailwind (already in the project):
- `menu` component for server list
- `badge` for role display
- `btn` for add/disconnect
- `input` for server URL

## Specification

1. Create `components/sidebar.tsx` using Jotai atoms from `state/servers.ts`.
2. Update root layout to include sidebar alongside `<Outlet />`.
3. Use DaisyUI components for consistent look.
4. Handle the "Add server" flow: input → addServer → popup → update sidebar.

## Acceptance Criteria
1. Sidebar visible on all pages.
2. Shows all connected servers with URL, user name, role badge.
3. Active server highlighted.
4. Click server → switches active server.
5. "Add server" → input → OAuth flow → server appears in list.
6. "Disconnect" → server removed from list.
7. Empty state shown when no servers connected.

## Verification Scenario
1. Open frontend → sidebar shows "Add server" prompt.
2. Add `https://kotel.localhost` → appears in sidebar with user info.
3. Add second server → both visible, click to switch.
4. Disconnect one → removed from sidebar.

## Testing
E2E Playwright tests in Step 27.

## Notes
- The sidebar is a core navigation element. All future pages will use it.
- Mobile-width responsive behavior (drawer/overlay) can be added later — not required for MVP.
- The `Outlet` component is TanStack Router's equivalent of React Router's outlet for nested routes.
