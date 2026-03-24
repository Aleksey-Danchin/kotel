---

## step-imp — 2026-03-23T17:56:57+03:00

**Result**: SUCCESS

### Changed Files
- `apps/frontend/src/components/sidebar.tsx` — added sidebar UI with server list, active highlighting, add-server form, empty state, and disconnect action.
- `apps/frontend/src/routes/~__root.tsx` — integrated two-column layout with persistent sidebar and main content area.
- `apps/frontend/src/api/auth.ts` — updated `removeServer` to perform logout request before local cleanup.
- `apps/frontend/src/api/auth.test.ts` — updated remove-server test to validate logout request.
- `apps/frontend/src/components/sidebar.test.tsx` — added tests for empty state, server rendering, and active-server highlighting.

### Tests
- Task-specific: 7 passed, 0 failed (`src/api/auth.test.ts`, `src/components/sidebar.test.tsx`)
- Regression: 15 passed, 0 failed (frontend Vitest suite)

### Acceptance Criteria
- [x] AC-1: Sidebar visible on all pages — verified by: root layout integration in `routes/~__root.tsx`.
- [x] AC-2: Shows connected servers with URL, user name, role badge — verified by: `src/components/sidebar.test.tsx`.
- [x] AC-3: Active server highlighted — verified by: `src/components/sidebar.test.tsx`.
- [x] AC-4: Click server switches active server — verified by: `setActiveServer` click handler in `components/sidebar.tsx` + code inspection.
- [x] AC-5: Add server input triggers OAuth flow and updates list — verified by: `src/api/auth.test.ts` and form submit logic in `components/sidebar.tsx`.
- [x] AC-6: Disconnect removes server from list — verified by: `src/api/auth.test.ts` and disconnect handler in `components/sidebar.tsx`.
- [x] AC-7: Empty state shown when no servers connected — verified by: `src/components/sidebar.test.tsx`.

### Discoveries
- `scripts/prettier.sh` is absent in this repository; formatting phase must be handled via language/package-specific format commands.
