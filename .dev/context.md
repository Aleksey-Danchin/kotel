## Step 01: Unify URL ID and selection state

- Выбор в `apps/designer` синхронизируется с pathname в `~__root.tsx` (`selectionIdFromPathname` + статический список сегментов), а не только из дочерних роутов — иначе первый кадр после навигации видит устаревший `routeContextAtom`.
- Ключи persistence: `kotel.designer.activeServerId` (сегмент маршрута из `URL.host` с `:` → `.`), `kotel.designer.lastChatByServerId`; при миграции читаются старые `kotel.designer.activeServerUrl` / `kotel.designer.selectedChatId`, затем удаляются.

## Step 02: URL-driven navigation and exit flows

- Навигация по серверу/чату централизована в `state/designerNavigation.ts` (`enterServer`, `enterChat`, `exitChatToServer`, `exitServerToRoot`).
- Сброс `lastChatByServerId` для сервера владельца чата выполняется при любом переходе с URL `/:chatId` на другой путь (`applyLastChatCleanupOnPathnameChange` в `useLayoutEffect` корня), включая браузерные Back/Forward и клики по карточкам.
- `activeServerId` в корне выравнивается с pathname (сегмент `/$id` как сервер или как чат через `resolveRouteParam`), чтобы история браузера не оставляла рассогласованный выбор.

## Step 04: Enrich chat mocks and message stream

- Моки чатов: поле `type: "person" | "group"` и опционально `peerName` для личных; шапка через `chatHeaderTitle()` в `store.ts`.
- Сообщения: `author` — id пользователя (`mock-user-*` или peer-id); исходящее: `message.author === selectedServer.user.id`.
- Имитация загрузки треда: `CHAT_STREAM_LOAD_MS` в `routes/~$id/~index.tsx` при смене `serverUrl` или `chatId` (скелетон в теле чата).
- В репозитории нет `scripts/prettier.sh`; проверка сборки дизайнера: `cd apps/designer && npm run build`.
