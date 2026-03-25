import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  chatsForSelectedServerAtom,
  selectedChatIdAtom,
  selectedServerAtom,
} from "../../state/store";

export const Route = createFileRoute("/$chatId/")({
  component: ChatPage,
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const selectedServer = useAtomValue(selectedServerAtom);
  const chats = useAtomValue(chatsForSelectedServerAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);

  const chat = chats.find((c) => c.id === chatId);

  useEffect(() => {
    if (chat) {
      setSelectedChatId(chat.id);
    } else {
      setSelectedChatId(null);
    }
  }, [chat, setSelectedChatId]);

  if (!selectedServer) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col">
        <div className="rounded-box border border-base-300 bg-base-100 p-4 text-sm text-base-content/80">
          Выберите сервер слева, чтобы открыть чат.
        </div>
      </section>
    );
  }

  if (!chat) {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col">
        <div className="rounded-box border border-base-300 bg-base-100 p-4 text-sm text-base-content/80">
          Чат не найден для этого сервера или неверный адрес.
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col">
      <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
        <header>
          <h1 className="text-2xl font-semibold">{chat.title}</h1>
          <p className="mt-1 text-sm text-base-content/80">{chat.subtitle}</p>
        </header>

        <div className="rounded-box bg-base-100 p-3 text-sm text-base-content/80">
          Тут будет список сообщений (пока заглушка для верстки макета).
        </div>
      </div>
    </section>
  );
}
