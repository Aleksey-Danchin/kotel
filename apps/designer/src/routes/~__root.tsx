import {
  createRootRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { defaultStore } from "../global/defaultStore";
import { DESIGNER_LOADING_DELAY_MS } from "../components/loadingDelay";
import { SettingsOverlay } from "../components/SettingsOverlay";
import {
  applyLastChatCleanupOnPathnameChange,
  exitChatToServer,
  exitServerToRoot,
} from "../state/designerNavigation";
import { activeServerIdAtom } from "../state/selectionAtoms";
import {
  resolveNextActiveServerId,
  resolveRouteContextForPathname,
  routeContextAtom,
} from "../state/store";
import { serversAtom } from "../state/servers";
import { resolveDesignerRoutePath } from "../state/routePath";
import { ChatColumn } from "./ChatColumn";
import { ChatsColumn } from "./ChatsColumn";
import { ServicesColumn } from "./ServicesColumn";
import { selectedServerAtom } from "../state/store";

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

export type EscapeNavigationAction = "exit-chat" | "exit-server" | "clear-active-server" | "none";

export function resolveEscapeNavigationAction(
  pathname: string,
  activeServerId: string | null,
): EscapeNavigationAction {
  const route = resolveDesignerRoutePath(pathname);
  if (route.kind === "server-chat") {
    return "exit-chat";
  }
  if (route.kind === "server") {
    return "exit-server";
  }
  if (activeServerId != null && activeServerId !== "") {
    return "clear-active-server";
  }
  return "none";
}

function RootLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setRouteCtx = useSetAtom(routeContextAtom);
  const pathnameRef = useRef(pathname);
  const prevPathnameRef = useRef<string | null>(null);
  const [startupLoading, setStartupLoading] = useState(true);
  const selectedServer = useAtomValue(selectedServerAtom);
  const parsedRoute = resolveDesignerRoutePath(pathname);
  const isConfigMode =
    parsedRoute.kind === "config" || parsedRoute.kind === "config-server";

  useLayoutEffect(() => {
    const prev = prevPathnameRef.current;
    if (prev !== null && prev !== pathname) {
      applyLastChatCleanupOnPathnameChange(prev, pathname);
    }
    prevPathnameRef.current = pathname;

    const serversMap = defaultStore.get(serversAtom);
    const nextRouteContext = resolveRouteContextForPathname(pathname, serversMap);
    setRouteCtx(nextRouteContext);
    const currentActiveServerId = defaultStore.get(activeServerIdAtom);
    defaultStore.set(
      activeServerIdAtom,
      resolveNextActiveServerId(nextRouteContext, currentActiveServerId),
    );
  }, [pathname, setRouteCtx]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setStartupLoading(false),
      DESIGNER_LOADING_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }
      if (document.querySelector("dialog[open]")) {
        return;
      }
      const route = resolveDesignerRoutePath(pathnameRef.current);
      const activeId = defaultStore.get(activeServerIdAtom);
      const isChatRoute = route.kind === "server-chat";
      const action = resolveEscapeNavigationAction(pathnameRef.current, activeId);

      const target = event.target;
      if (target instanceof Element) {
        if (
          isChatRoute &&
          target.closest("[data-chat-composer='true']")
        ) {
          event.preventDefault();
          exitChatToServer(navigate, route.serverId);
          return;
        }

        if (target.closest("input, textarea, select, [contenteditable=true]")) {
          return;
        }
      }

      if (action === "exit-chat" && route.kind === "server-chat") {
        event.preventDefault();
        exitChatToServer(navigate, route.serverId);
        return;
      }

      if (action === "exit-server") {
        event.preventDefault();
        exitServerToRoot(navigate);
        return;
      }

      if (action === "clear-active-server") {
        event.preventDefault();
        defaultStore.set(activeServerIdAtom, null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="h-dvh overflow-hidden bg-base-100">
      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] overflow-hidden">
        <div className="flex h-full min-h-0 w-70 shrink-0">
          <ServicesColumn isLoading={startupLoading} />
        </div>

        {isConfigMode ? (
          <>
            <div className="flex h-full min-h-0 w-70 shrink-0 border-r border-base-300 bg-base-200" />
            <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-[gray]">
              {selectedServer ? (
                <SettingsOverlay mode="route" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-2xl text-base-content/80">
                    Выберите сервер
                  </p>
                </div>
              )}
              <Outlet />
            </main>
          </>
        ) : (
          <>
            <div className="flex h-full min-h-0 w-70 shrink-0">
              <ChatsColumn isLoading={startupLoading} />
            </div>

            <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-[gray]">
              <ChatColumn isLoading={startupLoading}>
                <Outlet />
              </ChatColumn>
            </main>
          </>
        )}

        <TanStackRouterDevtools />
      </div>
    </div>
  );
}
