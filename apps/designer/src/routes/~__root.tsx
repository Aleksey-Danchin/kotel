import {
  createRootRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { defaultStore } from "../global/defaultStore";
import { selectedChatIdAtom, selectedServerUrlAtom } from "../state/store";
import { ChatsColumn } from "./ChatsColumn";
import { ServicesColumn } from "./ServicesColumn";

export const Route = createRootRoute({
  component: () => <RootLayout />,
});

function RootLayout() {
  const navigate = useNavigate();
  const setChatId = useSetAtom(selectedChatIdAtom);
  const setServerUrl = useSetAtom(selectedServerUrlAtom);
  const matches = useRouterState({ select: (s) => s.matches });
  const matchesRef = useRef(matches);
  matchesRef.current = matches;

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

      const onChatRoute = matchesRef.current.some(
        (m) => typeof (m.params as { chatId?: string }).chatId === "string",
      );

      if (onChatRoute) {
        event.preventDefault();
        setChatId(null);
        navigate({ to: "/" });
        return;
      }

      const serverUrl = defaultStore.get(selectedServerUrlAtom);
      if (serverUrl != null && serverUrl !== "") {
        event.preventDefault();
        setServerUrl(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, setChatId, setServerUrl]);

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
