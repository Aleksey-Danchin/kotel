import { useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { ColumnHeaderGear } from "../components/ColumnHeaderGear";
import { ChatCard } from "../components/ChatCard";
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

export function ChatsColumn() {
  const navigate = useNavigate();
  const selectedServer = useAtomValue(selectedServerAtom);
  const chats = useAtomValue(chatsForSelectedServerAtom);
  const highlightedChatId = useAtomValue(effectiveChatIdAtom);

  const content = (() => {
    if (!selectedServer) return null;

    if (chats.length === 0)
      return (
        <div className="text-sm text-base-content/80">Нет начатых чатов.</div>
      );

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

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-base-200 p-1">
      <header className="shrink-0 border-b border-base-300 px-2 py-2">
        <div className="flex items-center justify-between gap-2">
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
