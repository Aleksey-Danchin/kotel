import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";

import {
  buildChatTimelineRows,
  formatMessageTimestamp,
} from "../state/chatMessageTimeline";
import { useChatThreadScroll } from "../state/chatThreadScrollContext";
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
  const chatScroll = useChatThreadScroll();
  const getScrollElement = chatScroll?.getScrollElement;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => getScrollElement?.() ?? null,
    estimateSize: (index) => (rows[index]?.kind === "day-badge" ? 44 : 92),
    getItemKey: (index) => rows[index]?.key ?? `row:${index}`,
    overscan: 10,
  });

  if (messages.length === 0) {
    return <p className="text-sm text-base-content/60">Сообщений нет</p>;
  }

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        if (!row) {
          return null;
        }

        const rowWrapperProps = {
          "data-index": virtualRow.index,
          ref: virtualizer.measureElement,
          style: {
            position: "absolute" as const,
            left: 0,
            top: 0,
            width: "100%",
            transform: `translateY(${virtualRow.start}px)`,
          },
        };

        if (row.kind === "day-badge") {
          return (
            <div key={virtualRow.key} {...rowWrapperProps}>
              <div className="w-full px-3 py-2">
                <div className="relative flex items-center justify-center">
                  <span
                    className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#80808082]"
                    aria-hidden="true"
                  />
                  <span className="badge badge-outline relative z-10 rounded-full bg-[#80808082] border-[#80808082] px-3 text-base-content/70">
                    {row.label}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        const message = row.message;
        const outgoing = message.userId === sessionUserId;
        return (
          <div key={virtualRow.key} {...rowWrapperProps}>
            <div className="w-full py-1.5">
              <div
                className={clsx(
                  "chat px-0",
                  outgoing ? "chat-end" : "chat-start",
                )}
              >
                {/*
                  daisyUI chat-bubble сам рисует корректный хвостик по стороне (start/end).
                  Ширина: то же число px, что max-w-[…px] у треда в ChatColumn.
                */}
                <div
                  className={clsx(
                    "chat-bubble flex max-w-[min(100%,448px)] flex-col gap-3 text-sm shadow-sm",
                    outgoing
                      ? "me-[10px] chat-bubble-primary border border-primary/20"
                      : "ms-[10px] chat-bubble-neutral border border-base-300/80",
                  )}
                >
                  <p className="whitespace-pre-wrap wrap-break-word leading-snug">
                    {message.text}
                  </p>
                  <time
                    className="block text-end text-xs text-base-content/55"
                    dateTime={message.createdAt}
                  >
                    {formatMessageTimestamp(message.createdAt)}
                  </time>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
