import clsx from "clsx";

import type { ChatMessage } from "../state/store";

function formatMessageTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface ChatMessageListProps {
  messages: ChatMessage[];
  sessionUserId: string;
}

export function ChatMessageList({
  messages,
  sessionUserId,
}: ChatMessageListProps) {
  if (messages.length === 0) {
    return <p className="text-sm text-base-content/60">Сообщений нет</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => {
        const outgoing = message.author === sessionUserId;
        return (
          <li key={message.id} className={clsx("chat px-0", outgoing ? "chat-end" : "chat-start")}>
            {/*
              daisyUI chat-bubble сам рисует корректный хвостик по стороне (start/end).
              Ширина: то же число px, что max-w-[…px] у треда в ChatColumn.
            */}
            <div
              className={clsx(
                "chat-bubble max-w-[min(100%,448px)] text-sm shadow-sm",
                outgoing
                  ? "me-[10px] chat-bubble-primary border border-primary/20"
                  : "ms-[10px] chat-bubble-neutral border border-base-300/80",
              )}
            >
              <p className="whitespace-pre-wrap wrap-break-word leading-snug">
                {message.text}
              </p>
              <time
                className="mt-1.5 block text-end text-xs text-base-content/55"
                dateTime={message.createdAt}
              >
                {formatMessageTimestamp(message.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
