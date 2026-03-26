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
    return (
      <div className="w-full h-full flex justify-center items-center text-2xl">
        Сообщений нет
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {messages.map((message) => {
        const outgoing = message.author === sessionUserId;
        return (
          <li
            key={message.id}
            className={clsx(
              "relative z-1 flex w-full pb-0.5",
              outgoing ? "justify-end" : "justify-start",
            )}
          >
            {/*
              Ширина пузыря: то же число px, что max-w-[…px] у треда в ChatColumn.
              Смещение от края треда: me-[…px] (исходящие), ms-[…px] (входящие).
              Хвостик (комикс): after:* — положение/размер можно подкрутить отдельно от пузыря.
            */}
            <div
              className={clsx(
                "relative max-w-[min(100%,448px)] rounded-box px-3 py-2 text-sm shadow-sm",
                "after:pointer-events-none after:absolute after:h-0 after:w-0",
                "after:border-x-[7px] after:border-x-transparent after:border-t-[9px]",
                outgoing
                  ? clsx(
                      "me-[10px] bg-primary/15 text-base-content border border-primary/20",
                      "after:-bottom-[5px] after:right-[22px] after:left-auto after:border-t-primary/15",
                    )
                  : clsx(
                      "ms-[10px] bg-base-200/90 text-base-content border border-base-300/80",
                      "after:-bottom-[5px] after:left-[22px] after:border-t-base-200/90",
                    ),
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
