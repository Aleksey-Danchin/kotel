import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import { ChatMessageBodySkeleton } from "../../components/ChatMessageBodySkeleton";
import { ChatMessageList } from "../../components/ChatMessageList";
import { lastChatByServerIdAtom } from "../../state/selectionAtoms";
import { serverRouteIdFromServerUrl } from "../../state/serverRouteId";
import {
  getChatMessages,
  selectedChatAtom,
  selectedServerAtom,
} from "../../state/store";

/** Детерминированная задержка имитации загрузки треда в песочнице (без сети). */
const CHAT_STREAM_LOAD_MS = 420;

export const Route = createFileRoute("/$id/")({
  component: IdShellPage,
});

function IdShellPage() {
  const selectedServer = useAtomValue(selectedServerAtom);
  const selectedChat = useAtomValue(selectedChatAtom);
  const setLastByServer = useSetAtom(lastChatByServerIdAtom);

  const [streamLoading, setStreamLoading] = useState(false);

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

  useEffect(() => {
    if (!selectedServer || !selectedChat) {
      setStreamLoading(false);
      return;
    }

    setStreamLoading(true);
    const timer = window.setTimeout(() => {
      setStreamLoading(false);
    }, CHAT_STREAM_LOAD_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedServer?.serverUrl, selectedChat?.id]);

  if (!selectedServer || !selectedChat) {
    return null;
  }

  const messages = getChatMessages(selectedChat.id);
  const sessionUserId = selectedServer.user.id;

  if (streamLoading) {
    return <ChatMessageBodySkeleton />;
  }

  return (
    <ChatMessageList messages={messages} sessionUserId={sessionUserId} />
  );
}
