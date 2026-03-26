import { useMemo } from "react";
import clsx from "clsx";

import {
  buildChatTimelineRows,
  formatMessageTimestamp,
} from "../state/chatMessageTimeline";
import type { ChatMessage } from "../state/store";

export interface ChatMessageListProps {
  messages: ChatMessage[];
  sessionUserId: string;
}

export function ChatMessageList({
  messages,
  sessionUserId,
}: ChatMessageListProps) {
  const rows = useMemo(() => buildChatTimelineRows(messages), [messages]);

  if (messages.length === 0) {
    return <p className="text-sm text-base-content/60">Сообщений нет</p>;
  }

  return (
    <div className="w-full space-y-1">
      {rows.map((row) => {
        if (!row) {
          return null;
        }

        if (row.kind === "day-badge") {
          return (
            <div key={row.key} className="w-full px-3 py-2">
              <div className="flex justify-center">
                <span className="badge badge-neutral badge-outline rounded-full px-3">
                  {row.label}
                </span>
              </div>
            </div>
          );
        }

        const message = row.message;
        const outgoing = message.userId === sessionUserId;
        return (
          <div key={row.key} className="w-full py-1.5">
            <div
              className={clsx("chat px-0", outgoing ? "chat-end" : "chat-start")}
            >
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
