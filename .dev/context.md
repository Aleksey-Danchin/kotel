## Step 01: Unify URL ID and selection state

- Выбор в `apps/designer` синхронизируется с pathname в `~__root.tsx` (`selectionIdFromPathname` + статический список сегментов), а не только из дочерних роутов — иначе первый кадр после навигации видит устаревший `routeContextAtom`.
- Ключи persistence: `kotel.designer.activeServerId` (сегмент маршрута из `URL.host` с `:` → `.`), `kotel.designer.lastChatByServerId`; при миграции читаются старые `kotel.designer.activeServerUrl` / `kotel.designer.selectedChatId`, затем удаляются.
