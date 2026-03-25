import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { lastChatByServerIdAtom } from "../../state/selectionAtoms";
import { selectedChatAtom, selectedServerAtom } from "../../state/store";
import { serverRouteIdFromServerUrl } from "../../state/serverRouteId";

export const Route = createFileRoute("/$id/")({
  component: IdShellPage,
});

function IdShellPage() {
  const selectedServer = useAtomValue(selectedServerAtom);
  const selectedChat = useAtomValue(selectedChatAtom);
  const setLastByServer = useSetAtom(lastChatByServerIdAtom);

  useEffect(() => {
    if (!selectedServer) return;

    const routeId = serverRouteIdFromServerUrl(selectedServer.serverUrl);

    if (selectedChat) {
      setLastByServer((prev) => ({
        ...prev,
        [routeId]: selectedChat.id,
      }));
    }
  }, [selectedServer, selectedChat, setLastByServer]);

  if (!selectedServer || !selectedChat) {
    return null;
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-3 text-sm text-base-content/80">
      Тут будет список сообщений (пока заглушка для верстки макета).
    </div>
  );
}
