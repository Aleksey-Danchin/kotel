import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { selectedChatAtom } from "../state/store";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const selectedChat = useAtomValue(selectedChatAtom);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col">
      {selectedChat ? (
        <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
          <header>
            <h1 className="text-2xl font-semibold">{selectedChat.title}</h1>
            <p className="mt-1 text-sm text-base-content/80">
              {selectedChat.subtitle}
            </p>
          </header>

          <div className="rounded-box bg-base-100 p-3 text-sm text-base-content/80">
            Тут будет список сообщений (пока заглушка для верстки макета).
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-box border border-base-300 bg-base-100 p-4">
          <h1 className="text-2xl font-semibold">Главная</h1>
          <p className="text-sm text-base-content/80">
            Выберите сервер и чат — здесь появится контент.
          </p>
        </div>
      )}
    </section>
  );
}
