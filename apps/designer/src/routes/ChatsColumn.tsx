import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { ChatCard } from "../components/ChatCard";
import {
  chatsForSelectedServerAtom,
  selectedChatIdAtom,
  selectedServerAtom,
} from "../state/store";

export function ChatsColumn() {
  const navigate = useNavigate();
  const selectedServer = useAtomValue(selectedServerAtom);
  const chats = useAtomValue(chatsForSelectedServerAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);

  const activeChatId = useRouterState({
    select: (state) =>
      (state.matches.at(-1)?.params as { chatId?: string } | undefined)?.chatId,
  });

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
            active={chat.id === activeChatId}
            onSelect={() => {
              setSelectedChatId(chat.id);
              navigate({
                to: "/$chatId",
                params: { chatId: chat.id },
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
