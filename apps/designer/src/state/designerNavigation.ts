import { defaultStore } from "../global/defaultStore";
import { activeServerIdAtom, lastChatByServerIdAtom } from "./selectionAtoms";
import { serversAtom, type ServerSession } from "./servers";
import { resolveRouteParam } from "./store";
import { selectionIdFromPathname } from "./routePath";
import { serverRouteIdFromServerUrl } from "./serverRouteId";

export type DesignerNavigate = (opts: {
  to: "/$id" | "/";
  params?: { id: string };
}) => void | Promise<unknown>;

/** If the user left a chat URL (`/:chatId`) to any other URL, return that chat's server route id to clear `lastChatByServerId`. */
export function serverRouteIdToClearAfterPathChange(
  prevPathname: string,
  nextPathname: string,
  serversMap: Map<string, ServerSession>,
  activeServerId: string | null,
): string | null {
  const prevSeg = selectionIdFromPathname(prevPathname);
  if (!prevSeg) return null;
  const prevRes = resolveRouteParam(prevSeg, serversMap, activeServerId);
  if (prevRes.kind !== "chat") return null;
  const nextSeg = selectionIdFromPathname(nextPathname);
  if (nextSeg === prevRes.chatId) return null;
  if (!nextSeg) {
    return serverRouteIdFromServerUrl(prevRes.serverUrl);
  }
  const nextRes = resolveRouteParam(nextSeg, serversMap, activeServerId);
  if (nextRes.kind === "unknown") {
    return serverRouteIdFromServerUrl(prevRes.serverUrl);
  }
  if (nextRes.kind === "server" && nextRes.serverUrl !== prevRes.serverUrl) {
    return null;
  }
  return serverRouteIdFromServerUrl(prevRes.serverUrl);
}

/** Applies pathname-driven last-chat cleanup (browser back/forward and all navigations). */
export function applyLastChatCleanupOnPathnameChange(
  prevPathname: string,
  nextPathname: string,
): void {
  const serversMap = defaultStore.get(serversAtom);
  const activeId = defaultStore.get(activeServerIdAtom);
  const rid = serverRouteIdToClearAfterPathChange(
    prevPathname,
    nextPathname,
    serversMap,
    activeId,
  );
  if (rid) {
    clearLastChatForServerRouteId(rid);
  }
}

export function clearLastChatForServerRouteId(serverRouteId: string): void {
  defaultStore.set(lastChatByServerIdAtom, (prev) => {
    if (prev[serverRouteId] === undefined) return prev;
    const next = { ...prev };
    delete next[serverRouteId];
    return next;
  });
}

export function enterServer(
  navigate: DesignerNavigate,
  serverRouteId: string,
): void {
  // Ensure server context switches even when URL stays the same chat id.
  defaultStore.set(activeServerIdAtom, serverRouteId);

  const lastByServer = defaultStore.get(lastChatByServerIdAtom);
  const lastChatId = lastByServer[serverRouteId];
  if (lastChatId) {
    const serversMap = defaultStore.get(serversAtom);
    const route = resolveRouteParam(lastChatId, serversMap, serverRouteId);
    if (
      route.kind === "chat" &&
      serverRouteIdFromServerUrl(route.serverUrl) === serverRouteId
    ) {
      void navigate({ to: "/$id", params: { id: lastChatId } });
      return;
    }
  }

  void navigate({ to: "/$id", params: { id: serverRouteId } });
}

/** From chat-level URL to this server's segment; `lastChat` cleanup runs on pathname transition. */
export function exitChatToServer(
  navigate: DesignerNavigate,
  serverRouteId: string,
): void {
  void navigate({ to: "/$id", params: { id: serverRouteId } });
}

export function enterChat(
  navigate: DesignerNavigate,
  chatId: string,
  _serverRouteId: string,
): void {
  // Аргумент нужен для сигнатуры вызовов/интуитивности переходов,
  // но в песочнице он не участвует в навигации.
  void _serverRouteId;
  void navigate({ to: "/$id", params: { id: chatId } });
}

export function exitServerToRoot(navigate: DesignerNavigate): void {
  defaultStore.set(activeServerIdAtom, null);
  void navigate({ to: "/" });
}
