import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { ColumnHeaderGear } from "../components/ColumnHeaderGear";
import { ChatCard } from "../components/ChatCard";
import { UserCard } from "../components/UserCard";
import { DESIGNER_LOADING_DELAY_MS } from "../components/loadingDelay";
import { ChatsColumnBodySkeleton } from "../components/ChatsColumnBodySkeleton";
import { ChatsColumnSkeleton } from "../components/ChatsColumnSkeleton";
import { enterChat } from "../state/designerNavigation";
import { isSearchMatch } from "../state/chatSearch";
import {
  chatsForSelectedServerAtom,
  effectiveChatIdAtom,
  selectedServerAtom,
  usersForSelectedServerAtom,
  findOrCreatePersonChat,
  resolvePersonChatPeer,
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
  const users = useAtomValue(usersForSelectedServerAtom);
  const highlightedChatId = useAtomValue(effectiveChatIdAtom);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filteredChats = chats.filter((chat) =>
    isSearchMatch(chat.title, debouncedSearch),
  );
  const filteredUsers = users.filter((user) =>
    isSearchMatch(user.fullname, debouncedSearch),
  );

  const content = (() => {
    if (serverSwitchLoading && selectedServer)
      return <ChatsColumnBodySkeleton />;
    if (!selectedServer) return null;

    if (filteredChats.length === 0 && filteredUsers.length === 0) {
      return (
        <div className="p-2 text-base-content/80 w-full h-full flex justify-center items-center text-2xl">
          {debouncedSearch.trim() ? "Ничего не найдено" : "Чатов нет"}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 p-1">
        {filteredChats.map((chat) => {
          const peerUser =
            chat.type === "person" ? resolvePersonChatPeer(chat, users) : null;

          return (
            <ChatCard
              key={chat.id}
              chat={chat}
              peerUser={peerUser}
              active={chat.id === highlightedChatId}
              onSelect={() => {
                const serverRid = serverRouteIdFromServerUrl(
                  selectedServer.serverUrl,
                );
                enterChat(navigate, chat.id, serverRid);
              }}
            />
          );
        })}
        <div className="mt-2 pt-2 border-t border-base-300">
          <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
            Пользователи
          </h3>
          <div className="flex flex-col gap-2">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onSelect={() => {
                  const serverId =
                    selectedServer.id ?? selectedServer.serverUrl;
                  const dm = findOrCreatePersonChat(serverId, user.id);
                  if (!dm) return;
                  const serverRid = serverRouteIdFromServerUrl(
                    selectedServer.serverUrl,
                  );
                  enterChat(navigate, dm.id, serverRid);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  })();

  if (isLoading) {
    return <ChatsColumnSkeleton />;
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-base-200 p-1">
      <header className="shrink-0 min-h-12 border-b border-base-300 bg-base-300 px-2">
        <div className="flex h-full items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-sm font-semibold text-base-content">
            {selectedServer
              ? displayServerHost(selectedServer.serverUrl)
              : "Чаты"}
          </h2>
          <ColumnHeaderGear />
        </div>
      </header>

      <div className="shrink-0 border-b border-base-300 p-2">
        <label className="input input-bordered flex items-center gap-2">
          <input
            type="text"
            className="grow"
            placeholder="Поиск чатов и пользователей"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search.trim() ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setSearch("")}
              aria-label="Очистить поиск"
            >
              X
            </button>
          ) : null}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>

      <footer
        className="shrink-0 min-h-10 border-t border-base-300"
        aria-hidden="true"
      />
    </aside>
  );
}
