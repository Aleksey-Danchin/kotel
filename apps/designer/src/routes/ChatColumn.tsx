import type { FormEventHandler } from "react";
import { useAtomValue } from "jotai";
import { selectedChatAtom } from "../state/store";

export interface ChatColumnProps {
  children: React.ReactNode;
}

/** Личный чат: в данных `title` — имя собеседника; группа/канал: `title` — название. */
export function ChatColumn({ children }: ChatColumnProps) {
  const selectedChat = useAtomValue(selectedChatAtom);

  const onComposerSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-l-2 border-base-content/20 bg-base-100">
      <header className="shrink-0 border-b border-base-300 px-4 py-3">
        {selectedChat ? (
          <>
            <h1 className="truncate text-lg font-semibold text-base-content">
              {selectedChat.title}
            </h1>
            {selectedChat.subtitle ? (
              <p className="mt-0.5 truncate text-sm text-base-content/70">
                {selectedChat.subtitle}
              </p>
            ) : null}
          </>
        ) : (
          <span className="text-sm text-base-content/50">Выберите чат</span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

      <footer className="shrink-0 border-t border-base-300 bg-base-100 p-3">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={onComposerSubmit}
        >
          <label className="min-w-0 flex-1" htmlFor="designer-chat-composer">
            <span className="sr-only">Текст сообщения</span>
            <textarea
              id="designer-chat-composer"
              className="textarea textarea-bordered min-h-16 max-h-40 w-full resize-y"
              placeholder="Сообщение..."
              rows={2}
              disabled={!selectedChat}
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary shrink-0"
            disabled={!selectedChat}
          >
            Отправить
          </button>
        </form>
      </footer>
    </div>
  );
}
