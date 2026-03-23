# Step 23: Mobile — session test screen and tab layout update

## Goal
Create the new mobile session test screen with OAuth login, multi-server display, and token debugging. Update the tab layout.

## Motivation
Same role as the web test page — primary tool for manually testing the OAuth flow on mobile during development.

## Type
feature, mobile

## Affected Area
- `apps/mobile/app/(tabs)/session-test.tsx` — new file (replace deleted one)
- `apps/mobile/app/(tabs)/_layout.tsx` — add session-test tab back with new icon

## Dependencies
Depends on Step 21 (mobile OAuth flow), Step 22 (mobile store + axios client).

## Current Behavior
Session test tab was removed in Step 03. The tab layout has no auth-related tab.

## Expected Behavior

### Session test screen (`app/(tabs)/session-test.tsx`)

React Native components (no web elements):

- **Server URL input + "Add server" button** — triggers mobile OAuth flow
- **Connected servers list** (FlatList):
  - Server URL
  - User name, role
  - "Check status" button → calls `/api/session/status`
  - "Logout" button
  - "Logout all devices" button
  - "Force refresh" button
- **Raw state dump** — JSON display of `serversAtom`
- **Token debug** (for dev only):
  - "Read access token" button → shows stored access token (truncated)
  - "Read refresh token" button → shows stored refresh token (truncated)

### Tab layout update

Add session-test back to `_layout.tsx`:
```typescript
<Tabs.Screen
  name="session-test"
  options={{ title: 'Auth Test', tabBarIcon: ({ color }) => <IconSymbol name="lock" color={color} /> }}
/>
```

### Styling

React Native Paper or Expo default components. Similar layout to old session-test but for multi-server.

## Specification

1. Create `app/(tabs)/session-test.tsx` with all testing functions.
2. Update `_layout.tsx` to include the new tab.
3. Use mobile OAuth flow from Step 21.
4. Use per-server client from Step 22.

## Acceptance Criteria
1. "Auth Test" tab visible in tab bar.
2. Can add server via OAuth.
3. Connected servers displayed with user info.
4. All action buttons work (status, logout, refresh).
5. Token debug shows stored values.
6. App compiles and runs.

## Verification Scenario
1. Open app → navigate to "Auth Test" tab.
2. Enter server URL, tap "Add server".
3. System browser opens → login → back to app.
4. Server appears in list with user info.
5. Tap "Check status" → info displayed.
6. Tap "Logout" → server removed.

## Testing
Manual testing on device/emulator.

## Notes
- The token debug buttons are for development only. They should display truncated values (first 8 chars...) for safety.
- This screen replaces the old session-test with a completely new implementation.
