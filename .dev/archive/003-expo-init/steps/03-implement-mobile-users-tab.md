# Step 03: Implement mobile users tab

## Goal
Implement a `users` tab in the Expo mobile app that duplicates frontend `users` page functionality (manual load, loading/error states, and users list fields) without copying web styling.

## Motivation
The mobile client must provide a backend-testing surface equivalent to frontend diagnostic pages so API behavior can be validated directly from mobile runtime.

## Type
feature, ui, backend

## Affected Area
`apps/mobile/app/(tabs)/users.tsx` (new), `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile` API/query modules (new or updated), and optional shared UI helper components in `apps/mobile/components`.

## Dependencies
Depends on step 02.

## Current Behavior
<CORRECTION by="step-executor" reason="users tab scaffold already exists">
A placeholder `users` route and tab registration already exist in mobile tabs (`app/(tabs)/users.tsx`, `app/(tabs)/_layout.tsx`), but they do not implement API loading behavior.
</CORRECTION>

Frontend behavior reference is `apps/frontend/src/routes/~users.tsx`, which:
- keeps query disabled by default;
- loads on explicit button click;
- shows loading and error states;
- renders `id`, `fullname`, `createdAt`, `updatedAt`.

## Expected Behavior
Mobile `users` tab should behave like frontend diagnostics:
- a "load" action triggers users fetch manually;
- show request-in-progress status;
- show backend error text on failure;
- render fetched rows with the same four fields;
- no strict visual parity requirement with web styles.

## Specification
Create mobile users API contract in app scope:
- define `UserRow` type aligned with frontend (`id`, `fullname`, `createdAt`, `updatedAt`);
- add `getUsers()` using the shared mobile Axios client (`GET /users` on configured `/api` base URL).

Create React Query options/helper for users query:
- query key equivalent to frontend semantics (`["users"]`);
- query disabled by default in screen component;
- manual `refetch()` on button press.

Build `app/(tabs)/users.tsx`:
- include action button to trigger fetch;
- include loading indicator while request is in flight;
- include error message block when query fails;
- include list/table-like rendering for returned users data with the four required fields;
- ensure list is scroll-safe on mobile if dataset grows.

Update tabs registration:
- ensure `users` tab title/icon are visible in tab bar and routable.

## Acceptance Criteria
1. Mobile app has a routable `users` tab screen.
2. Users request is not executed automatically on screen open; it runs only after explicit user action.
3. Loading and error states are shown in the screen UI.
4. Successful response renders `id`, `fullname`, `createdAt`, and `updatedAt` for each record.
5. Implementation uses mobile Axios + React Query foundation from step 02.

## Verification Scenario
1. Start dev stack and open app in Android emulator.
2. Open `users` tab.
3. Verify no request is made before tapping load action.
4. Tap load action and confirm loading indicator appears.
5. Verify users list appears with expected fields.
6. Simulate backend unavailability and verify error state message is shown.

## Testing
Manual-only in Android emulator:
- initial idle state;
- successful fetch rendering;
- error path rendering.

Automated tests are not required for this step.
<CORRECTION by="step-executor" reason="mobile app has no configured automated test runner">
`apps/mobile/package.json` does not define test scripts or test dependencies, so this step is verified by code inspection and manual scenario only.
</CORRECTION>

## Notes
Keep behavior parity with frontend logic, but use mobile-native primitives (`View`, `Text`, `Pressable`, `FlatList` or equivalent) instead of web table classes.
