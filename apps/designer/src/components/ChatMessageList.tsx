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
          <li
            key={message.id}
            className={clsx("flex w-full", outgoing ? "justify-end" : "justify-start")}
          >
            <div
              className={clsx(
                "max-w-[min(100%,28rem)] rounded-box px-3 py-2 text-sm shadow-sm",
                outgoing
                  ? "bg-primary/15 text-base-content border border-primary/20"
                  : "bg-base-200/90 text-base-content border border-base-300/80",
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
