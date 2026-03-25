---

## step-imp — 2026-03-25T19:28:00Z

**Result**: SUCCESS

### Changed Files

- `apps/designer/src/state/serverRouteId.ts` — новый: `serverRouteIdFromServerUrl`, поиск URL сессии по route id
- `apps/designer/src/state/routePath.ts` — новый: `selectionIdFromPathname`, статические сегменты
- `apps/designer/src/state/selectionAtoms.ts` — новый: `activeServerIdAtom`, `lastChatByServerIdAtom`, миграция localStorage
- `apps/designer/src/state/store.ts` — граф выбора: `routeContextAtom`, `resolveRouteParam`, `effectiveChatIdAtom`, без legacy chat persistence
- `apps/designer/src/state/servers.ts` — убран fallback на первый сервер и дублирующий `activeServerUrl` в persist; синхронизация с `activeServerIdAtom`
- `apps/designer/src/routes/~$id/~index.tsx` — новый маршрут вместо `~$chatId`
- `apps/designer/src/routes/~__root.tsx` — синхронизация `routeContextAtom` по pathname, Escape, без старых атомов
- `apps/designer/src/routes/ChatsColumn.tsx`, `ServicesColumn.tsx`, `~setup`, `~session-test` — навигация `/$id`, новые атомы
- `apps/designer/src/global/routeTree.gen.ts` — перегенерация (TanStack Router)
- `apps/designer/vitest.config.ts`, `package.json` — Vitest; `src/state/*.test.ts` — unit-тесты

### Tests

- Task-specific: 6 Vitest passed (serverRouteId, routePath)
- Regression: `npm run build` (tsc + vite) в `apps/designer` — OK

### Acceptance Criteria

- [x] AC-1: `/kotel.localhost` — serverId из host, чат из `lastChatByServerId` — логика в `effectiveChatIdAtom` + `resolveRouteParam`
- [x] AC-2: `/chat_xxx` — разрешение чата и сервера — `resolveRouteParam` + pick по `activeServerId`
- [x] AC-3: неизвестный id — пустой main и список чатов — `selectedServerAtom` null, нет текста ошибки
- [x] AC-4: `/` и пустое storage — выбор пустой — `activeServerIdAtom` null по умолчанию, `servers` без автопервого сервера
- [x] AC-5: legacy `selectedChatId` убран из runtime — миграция в `lastChatByServerId`, ключ удаляется
- [x] AC-6: активный сервер как `serverId` (route host key) — `kotel.designer.activeServerId`
- [x] AC-7: статические маршруты — `selectionIdFromPathname` + порядок файлов роутера

### Discoveries

- TanStack Router в проекте перегенерирует `routeTree.gen.ts` при `npm run build` в `apps/designer`; синхронизация выбора с URL сделана в корне через `useLayoutEffect` + `selectionIdFromPathname`, чтобы не было кадра со старым `routeContextAtom`.
