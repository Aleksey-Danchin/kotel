import {
  createRootRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { defaultStore } from "../global/defaultStore";
import { activeServerIdAtom } from "../state/selectionAtoms";
import { serversAtom } from "../state/servers";
import { resolveRouteParam, routeContextAtom } from "../state/store";
import { selectionIdFromPathname } from "../state/routePath";
import { ChatsColumn } from "./ChatsColumn";
import { ServicesColumn } from "./ServicesColumn";

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setRouteCtx = useSetAtom(routeContextAtom);
  const pathnameRef = useRef(pathname);

  useLayoutEffect(() => {
    const id = selectionIdFromPathname(pathname);
    if (id) {
      setRouteCtx({ type: "id", id });
    } else {
      setRouteCtx({ type: "index" });
    }
  }, [pathname, setRouteCtx]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }
      if (document.querySelector("dialog[open]")) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable=true]")
      ) {
        return;
      }

      const id = selectionIdFromPathname(pathnameRef.current);
      const serversMap = defaultStore.get(serversAtom);
      const activeId = defaultStore.get(activeServerIdAtom);

      if (id) {
        const r = resolveRouteParam(id, serversMap, activeId);
        if (r.kind === "chat") {
          event.preventDefault();
          void navigate({ to: "/" });
          return;
        }
        event.preventDefault();
        defaultStore.set(activeServerIdAtom, null);
        void navigate({ to: "/" });
        return;
      }

      if (activeId != null && activeId !== "") {
        event.preventDefault();
        defaultStore.set(activeServerIdAtom, null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-base-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <div className="w-70 shrink-0 self-stretch">
          <ServicesColumn />
        </div>

        <div className="w-70 shrink-0 self-stretch">
          <ChatsColumn />
        </div>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col p-6">
          <Outlet />
        </main>

        <TanStackRouterDevtools />
      </div>
    </div>
  );
}
