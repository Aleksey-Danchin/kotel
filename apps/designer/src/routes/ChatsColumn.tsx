import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { ChatCard } from "../components/ChatCard";
import {
  activeServerIdAtom,
  lastChatByServerIdAtom,
  type LastChatByServerId,
} from "../state/selectionAtoms";
import {
  chatsForSelectedServerAtom,
  effectiveChatIdAtom,
  selectedServerAtom,
} from "../state/store";
import { serverRouteIdFromServerUrl } from "../state/serverRouteId";

export function ChatsColumn() {
  const navigate = useNavigate();
  const selectedServer = useAtomValue(selectedServerAtom);
  const chats = useAtomValue(chatsForSelectedServerAtom);
  const highlightedChatId = useAtomValue(effectiveChatIdAtom);
  const setActiveServerId = useSetAtom(activeServerIdAtom);
  const setLastByServer = useSetAtom(lastChatByServerIdAtom);

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
              setLastByServer((prev: LastChatByServerId) => ({
                ...prev,
                [serverRid]: chat.id,
              }));
              setActiveServerId(serverRid);
              navigate({
                to: "/$id",
                params: { id: chat.id },
              });
            }}
          />
        ))}
      </div>
    );
  })();

  return (
    <aside className="flex h-full min-h-screen w-full flex-col border-r border-base-300 bg-base-200 p-1">
      {content}
    </aside>
  );
}
