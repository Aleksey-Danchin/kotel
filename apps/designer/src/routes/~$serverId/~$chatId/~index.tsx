import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import { ChatMessageBodySkeleton } from "../../../components/ChatMessageBodySkeleton";
import { ChatMessageList } from "../../../components/ChatMessageList";
import { DESIGNER_LOADING_DELAY_MS } from "../../../components/loadingDelay";
import {
  designerAppendedChatMessagesAtom,
  getMergedChatMessages,
} from "../../../state/chatComposerActions";
import { lastChatByServerIdAtom } from "../../../state/selectionAtoms";
import { serverRouteIdFromServerUrl } from "../../../state/serverRouteId";
import { useChatThreadScroll } from "../../../state/chatThreadScrollContext";
import {
  routeContextAtom,
  selectedChatAtom,
  selectedServerAtom,
  threadTransitionLoadingAtom,
} from "../../../state/store";

export const Route = createFileRoute("/$serverId/$chatId/")({
  component: ServerChatShellPage,
});

function ServerChatShellPage() {
  const selectedServer = useAtomValue(selectedServerAtom);
  const selectedChat = useAtomValue(selectedChatAtom);
  const routeCtx = useAtomValue(routeContextAtom);
  const appendedByChat = useAtomValue(designerAppendedChatMessagesAtom);
  const setLastByServer = useSetAtom(lastChatByServerIdAtom);
  const setThreadTransitionLoading = useSetAtom(threadTransitionLoadingAtom);
  const chatScroll = useChatThreadScroll();

  const [streamLoading, setStreamLoading] = useState(false);
  const initializedRef = useRef(false);
  const transitionIdRef = useRef(0);
  const prevStreamLoadingRef = useRef(streamLoading);
  const routeTransitionId =
    routeCtx.type === "server-chat"
      ? `${routeCtx.serverId}:${routeCtx.chatId}`
      : null;

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
    const serverUrl = selectedServer?.serverUrl;
    if (!serverUrl) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    transitionIdRef.current += 1;
    const myId = transitionIdRef.current;

    queueMicrotask(() => {
      if (transitionIdRef.current !== myId) return;
      setStreamLoading(true);
    });
    const timer = window.setTimeout(() => {
      if (transitionIdRef.current !== myId) return;
      setStreamLoading(false);
    }, DESIGNER_LOADING_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [selectedServer?.serverUrl, routeTransitionId]);

  useEffect(() => {
    setThreadTransitionLoading(streamLoading);
    return () => setThreadTransitionLoading(false);
  }, [streamLoading, setThreadTransitionLoading]);

  useEffect(() => {
    const wasLoading = prevStreamLoadingRef.current;
    prevStreamLoadingRef.current = streamLoading;
    if (wasLoading !== true || streamLoading !== false) return;
    if (!chatScroll || !selectedServer || !selectedChat) return;
    chatScroll.syncThreadScrollToBottom();
  }, [streamLoading, chatScroll, selectedServer, selectedChat]);

  useEffect(() => {
    if (
      !chatScroll ||
      streamLoading ||
      !selectedServer ||
      !selectedChat
    ) {
      return;
    }
    const msgs = getMergedChatMessages(selectedChat.id, appendedByChat);
    chatScroll.notifyThreadMessagesSnapshot(msgs, selectedServer.user.id);
  }, [
    chatScroll,
    streamLoading,
    selectedServer,
    selectedChat,
    appendedByChat,
  ]);

  if (!selectedServer) {
    return null;
  }

  if (streamLoading) {
    return <ChatMessageBodySkeleton />;
  }

  if (!selectedChat) {
    return null;
  }

  const messages = getMergedChatMessages(selectedChat.id, appendedByChat);
  const sessionUserId = selectedServer.user.id;

  return <ChatMessageList messages={messages} sessionUserId={sessionUserId} />;
}
