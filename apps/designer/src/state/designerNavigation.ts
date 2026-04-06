import { defaultStore } from "../global/defaultStore";
import { activeServerIdAtom, lastChatByServerIdAtom } from "./selectionAtoms";
import { serverRouteIdFromServerUrl } from "./serverRouteId";
import { serversAtom } from "./servers";
import { resolveDesignerRoutePath } from "./routePath";
import { resolveChatForServerRoute } from "./store";

export type DesignerNavigate = (opts: {
  to: "/" | "/config" | "/config/$serverId" | "/$serverId" | "/$serverId/$chatId";
  params?: { serverId?: string; chatId?: string };
}) => void | Promise<unknown>;

export type ConfiguratorNavigationTarget =
  | { to: "/config/$serverId"; params: { serverId: string } }
  | { to: "/config" };

export function serverRouteIdToClearAfterPathChange(
  prevPathname: string,
  nextPathname: string,
): string | null {
  const prevRoute = resolveDesignerRoutePath(prevPathname);
  if (prevRoute.kind !== "server-chat") {
    return null;
  }
  const nextRoute = resolveDesignerRoutePath(nextPathname);
  if (
    nextRoute.kind === "server-chat" &&
    nextRoute.serverId === prevRoute.serverId &&
    nextRoute.chatId === prevRoute.chatId
  ) {
    return null;
  }
  if (
    nextRoute.kind === "server" &&
    nextRoute.serverId !== prevRoute.serverId
  ) {
    return null;
  }
  return prevRoute.serverId;
}

/** Applies pathname-driven last-chat cleanup (browser back/forward and all navigations). */
export function applyLastChatCleanupOnPathnameChange(
  prevPathname: string,
  nextPathname: string,
): void {
  const rid = serverRouteIdToClearAfterPathChange(prevPathname, nextPathname);
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

export function isConfiguratorPath(pathname: string): boolean {
  const route = resolveDesignerRoutePath(pathname);
  return route.kind === "config" || route.kind === "config-server";
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
    const chat = resolveChatForServerRoute(serverRouteId, lastChatId, serversMap);
    if (chat) {
      void navigate({
        to: "/$serverId/$chatId",
        params: { serverId: serverRouteId, chatId: chat.id },
      });
      return;
    }
  }

  void navigate({ to: "/$serverId", params: { serverId: serverRouteId } });
}

export function enterConfigServer(
  navigate: DesignerNavigate,
  serverRouteId: string,
): void {
  defaultStore.set(activeServerIdAtom, serverRouteId);
  void navigate({ to: "/config/$serverId", params: { serverId: serverRouteId } });
}

export function resolveConfiguratorNavigationTarget(
  activeServerId: string | null,
  serversMap: Map<string, { serverUrl: string }>,
): ConfiguratorNavigationTarget {
  if (!activeServerId) {
    return { to: "/config" };
  }

  const hasActiveServer = Array.from(serversMap.values()).some((session) => {
    return serverRouteIdFromServerUrl(session.serverUrl) === activeServerId;
  });
  if (!hasActiveServer) {
    return { to: "/config" };
  }

  return { to: "/config/$serverId", params: { serverId: activeServerId } };
}

/** From chat-level URL to this server's segment; `lastChat` cleanup runs on pathname transition. */
export function exitChatToServer(
  navigate: DesignerNavigate,
  serverRouteId: string,
): void {
  void navigate({ to: "/$serverId", params: { serverId: serverRouteId } });
}

export function enterChat(
  navigate: DesignerNavigate,
  chatId: string,
  serverRouteId: string,
): void {
  void navigate({
    to: "/$serverId/$chatId",
    params: { serverId: serverRouteId, chatId },
  });
}

export function exitServerToRoot(navigate: DesignerNavigate): void {
  defaultStore.set(activeServerIdAtom, null);
  void navigate({ to: "/" });
}
