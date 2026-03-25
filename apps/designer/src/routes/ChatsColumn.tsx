import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { ColumnHeaderGear } from "../components/ColumnHeaderGear";
import { ChatCard } from "../components/ChatCard";
import { DESIGNER_LOADING_DELAY_MS } from "../components/loadingDelay";
import { ChatsColumnBodySkeleton } from "../components/ChatsColumnBodySkeleton";
import { ChatsColumnSkeleton } from "../components/ChatsColumnSkeleton";
import { enterChat } from "../state/designerNavigation";
import {
  chatsForSelectedServerAtom,
  effectiveChatIdAtom,
  selectedServerAtom,
} from "../state/store";
import { serverRouteIdFromServerUrl } from "../state/serverRouteId";

function displayServerHost(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname;
  } catch {
    return serverUrl;
  }
}

export interface ChatsColumnProps {
  isLoading?: boolean;
}

export function ChatsColumn({ isLoading = false }: ChatsColumnProps) {
  const navigate = useNavigate();
  const selectedServer = useAtomValue(selectedServerAtom);
  const chats = useAtomValue(chatsForSelectedServerAtom);
  const highlightedChatId = useAtomValue(effectiveChatIdAtom);

  const [serverSwitchLoading, setServerSwitchLoading] = useState(false);
  const initializedRef = useRef(false);
  const transitionIdRef = useRef(0);

  useEffect(() => {
    if (isLoading) return;

    const serverUrl = selectedServer?.serverUrl;
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (!serverUrl) return;

    transitionIdRef.current += 1;
    const myId = transitionIdRef.current;

    // eslint/React rule: avoid direct setState in effect body.
    // We still want the skeleton to appear immediately, so flip the state
    // in a microtask and guard against stale transitions.
    queueMicrotask(() => {
      if (transitionIdRef.current !== myId) return;
      setServerSwitchLoading(true);
    });
    const timer = window.setTimeout(() => {
      if (transitionIdRef.current !== myId) return;
      setServerSwitchLoading(false);
    }, DESIGNER_LOADING_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isLoading, selectedServer?.serverUrl]);

  const content = (() => {
    if (serverSwitchLoading && selectedServer) return <ChatsColumnBodySkeleton />;
    if (!selectedServer) return null;

    if (chats.length === 0) {
      return <div className="p-2 text-sm text-base-content/80">Чатов нет</div>;
    }

    return (
      <div className="flex flex-col gap-2 p-1">
        {chats.map((chat) => (
          <ChatCard
            key={chat.id}
            chat={chat}
            active={chat.id === highlightedChatId}
            onSelect={() => {
              const serverRid = serverRouteIdFromServerUrl(
                selectedServer.serverUrl,
              );
              enterChat(navigate, chat.id, serverRid);
            }}
          />
        ))}
      </div>
    );
  })();

  if (isLoading) {
    return <ChatsColumnSkeleton />;
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-base-200 p-1">
      <header className="shrink-0 min-h-12 border-b border-base-300 px-2">
        <div className="flex h-full items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-sm font-semibold text-base-content">
            {selectedServer
              ? displayServerHost(selectedServer.serverUrl)
              : "Чаты"}
          </h2>
          <ColumnHeaderGear />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>

      <footer
        className="shrink-0 min-h-10 border-t border-base-300"
        aria-hidden="true"
      />
    </aside>
  );
}
