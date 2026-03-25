import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  activeServerIdAtom,
  lastChatByServerIdAtom,
} from "../../state/selectionAtoms";
import { selectedChatAtom, selectedServerAtom } from "../../state/store";
import { serverRouteIdFromServerUrl } from "../../state/serverRouteId";

export const Route = createFileRoute("/$id/")({
  component: IdShellPage,
});

function IdShellPage() {
  const selectedServer = useAtomValue(selectedServerAtom);
  const selectedChat = useAtomValue(selectedChatAtom);
  const setActiveServerId = useSetAtom(activeServerIdAtom);
  const setLastByServer = useSetAtom(lastChatByServerIdAtom);

  useEffect(() => {
    if (!selectedServer) return;

    const routeId = serverRouteIdFromServerUrl(selectedServer.serverUrl);
    setActiveServerId(routeId);

    if (selectedChat) {
      setLastByServer((prev) => ({
        ...prev,
        [routeId]: selectedChat.id,
      }));
    }
  }, [selectedServer, selectedChat, setActiveServerId, setLastByServer]);

  if (!selectedServer) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col" aria-hidden />
    );
  }

  if (!selectedChat) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col" aria-hidden />
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col">
      <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
        <header>
          <h1 className="text-2xl font-semibold">{selectedChat.title}</h1>
          <p className="mt-1 text-sm text-base-content/80">
            {selectedChat.subtitle}
          </p>
        </header>

        <div className="rounded-box bg-base-100 p-3 text-sm text-base-content/80">
          Тут будет список сообщений (пока заглушка для верстки макета).
        </div>
      </div>
    </section>
  );
}
