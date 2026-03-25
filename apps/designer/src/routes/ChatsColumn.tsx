import { useAtomValue, useSetAtom } from "jotai";
import { ChatCard } from "../components/ChatCard";
import {
  chatsForSelectedServerAtom,
  selectedChatAtom,
  selectedChatIdAtom,
  selectedServerAtom,
} from "../state/store";

export function ChatsColumn() {
  const selectedServer = useAtomValue(selectedServerAtom);
  const chats = useAtomValue(chatsForSelectedServerAtom);
  const selectedChat = useAtomValue(selectedChatAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);

  const content = (() => {
    if (!selectedServer)
      return (
        <div className="text-sm text-base-content/80">
          Выберите сервер слева, чтобы увидеть чаты.
        </div>
      );

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
            active={chat.id === selectedChat?.id}
            onSelect={() => setSelectedChatId(chat.id)}
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
