import {
  useCallback,
  useState,
  type FormEventHandler,
  type KeyboardEventHandler,
} from "react";
import { useAtomValue } from "jotai";

import { ColumnHeaderGear } from "../components/ColumnHeaderGear";
import { ChatColumnSkeleton } from "../components/ChatColumnSkeleton";
import { sendDesignerChatMessage } from "../state/chatComposerActions";
import {
  chatHeaderTitle,
  selectedChatAtom,
  selectedServerAtom,
} from "../state/store";

export interface ChatColumnProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

/** Личный чат: в данных `title` — имя собеседника; группа/канал: `title` — название. */
export function ChatColumn({ children, isLoading = false }: ChatColumnProps) {
  const selectedChat = useAtomValue(selectedChatAtom);
  const selectedServer = useAtomValue(selectedServerAtom);
  const hasSelectedChat = Boolean(selectedChat && selectedServer);
  const [draft, setDraft] = useState("");

  const trySend = useCallback(() => {
    if (!selectedChat || !selectedServer) return;
    const text = draft;
    if (!text.trim()) return;
    sendDesignerChatMessage(selectedChat.id, text, selectedServer.user.id);
    setDraft("");
  }, [draft, selectedChat, selectedServer]);

  const onComposerSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    trySend();
  };

  const onComposerKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (
    event,
  ) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    trySend();
  };

  if (isLoading) {
    return <ChatColumnSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-l-2 border-base-content/20 bg-base-100">
      {hasSelectedChat ? (
        <header className="shrink-0 min-h-12 border-b border-base-300 px-2">
          <div className="flex h-full items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-base-content">
                {chatHeaderTitle(selectedChat!)}
              </h1>
            </div>
            <ColumnHeaderGear />
          </div>
        </header>
      ) : null}

      <div className={hasSelectedChat ? "min-h-0 flex-1 overflow-y-auto p-4" : "min-h-0 flex-1 overflow-y-auto"}>
        {children}
      </div>

      {hasSelectedChat ? (
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
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onComposerKeyDown}
                disabled={!selectedChat || !selectedServer}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary shrink-0"
              disabled={!selectedChat || !selectedServer}
            >
              Отправить
            </button>
          </form>
        </footer>
      ) : null}
    </div>
  );
}
