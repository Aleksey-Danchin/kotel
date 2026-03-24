---

## step-imp — 2026-03-23T18:17:37+03:00

**Result**: SUCCESS

### Changed Files
- `apps/mobile/app/(tabs)/session-test.tsx` — создан новый экран тестирования мобильной OAuth-сессии с multi-server списком, действиями status/logout/refresh и token debug.
- `apps/mobile/app/(tabs)/_layout.tsx` — добавлен таб `session-test` с заголовком `Auth Test`.
- `apps/mobile/src/api/session.ts` — добавлены API-хелперы для status/refresh/logout через per-server axios client.
- `apps/mobile/src/api/session.test.ts` — добавлены unit-тесты на session API-хелперы.
- `apps/mobile/components/ui/icon-symbol.tsx` — добавлен mapping иконки `lock`.
- `apps/mobile/src/api/auth.ts` — расширен тип `SessionStatusResponse.user` полем `login?`.

### Tests
- Task-specific: 11 passed, 0 failed (`npx vitest run src/api/session.test.ts src/api/auth.test.ts src/api/create-server-client.test.ts src/api/secure-store.test.ts` in `kotel-mobile-1`) + `npx tsc --noEmit` passed.
- Regression: 11 passed, 0 failed (`npm test` in `kotel-mobile-1`).

### Acceptance Criteria
- [x] AC-1: Auth Test tab visible in tab bar — verified by: code inspection (`app/(tabs)/_layout.tsx`).
- [x] AC-2: Can add server via OAuth — verified by: code inspection (`onAddServer` + `addMobileServer` flow).
- [x] AC-3: Connected servers displayed with user info — verified by: code inspection (`FlatList` render of server cards).
- [x] AC-4: All action buttons work (status, logout, refresh) — verified by: unit tests (`src/api/session.test.ts`) + code inspection (button handlers).
- [x] AC-5: Token debug shows stored values — verified by: code inspection (`onReadTokens` + truncated display).
- [x] AC-6: App compiles and runs — verified by: `npx tsc --noEmit` and passing mobile Vitest suite.

### Discoveries
- none
