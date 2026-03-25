import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEventHandler,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";
import { useAtomValue } from "jotai";
import clsx from "clsx";

import { ColumnHeaderGear } from "../components/ColumnHeaderGear";
import { ChatColumnSkeleton } from "../components/ChatColumnSkeleton";
import { sendDesignerChatMessage } from "../state/chatComposerActions";
import { ChatThreadScrollProvider } from "../state/chatThreadScrollContext";
import {
  DESIGNER_CHAT_STICKY_THRESHOLD_PX,
  isNearBottom,
} from "../state/chatThreadScrollLogic";
import type { ChatMessage } from "../state/store";
import {
  chatHeaderTitle,
  selectedChatAtom,
  selectedServerAtom,
} from "../state/store";

export interface ChatColumnProps {
  children: ReactNode;
  isLoading?: boolean;
}

/** Личный чат: в данных `title` — имя собеседника; группа/канал: `title` — название. */
export function ChatColumn({ children, isLoading = false }: ChatColumnProps) {
  const selectedChat = useAtomValue(selectedChatAtom);
  const selectedServer = useAtomValue(selectedServerAtom);
  const hasSelectedChat = Boolean(selectedChat && selectedServer);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [sticky, setSticky] = useState(true);
  const stickyRef = useRef(true);
  const [unreadBelow, setUnreadBelow] = useState(0);
  const prevSeenIdsRef = useRef<Set<string>>(new Set());
  const needsInitialSeedRef = useRef(true);

  useLayoutEffect(() => {
    stickyRef.current = sticky;
  }, [sticky]);

  const selectedChatId = selectedChat?.id ?? null;

  useLayoutEffect(() => {
    if (!hasSelectedChat || !selectedChatId) return;
    needsInitialSeedRef.current = true;
    prevSeenIdsRef.current = new Set();
    setSticky(true);
    stickyRef.current = true;
    setUnreadBelow(0);
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [hasSelectedChat, selectedChatId]);

  useLayoutEffect(() => {
    if (!hasSelectedChat || !selectedChatId) return;
    composerRef.current?.focus();
  }, [hasSelectedChat, selectedChatId]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = isNearBottom(el, DESIGNER_CHAT_STICKY_THRESHOLD_PX);
    setSticky(atBottom);
    if (atBottom) setUnreadBelow(0);
  }, []);

  const onComposerSent = useCallback(() => {
    setSticky(true);
    stickyRef.current = true;
    setUnreadBelow(0);
    requestAnimationFrame(() => {
      scrollToBottom();
      composerRef.current?.focus();
    });
  }, [scrollToBottom]);

  const jumpToBottom = useCallback(() => {
    setSticky(true);
    stickyRef.current = true;
    setUnreadBelow(0);
    scrollToBottom();
  }, [scrollToBottom]);

  const notifyThreadMessagesSnapshot = useCallback(
    (messages: ChatMessage[], sessionUserId: string) => {
      if (needsInitialSeedRef.current) {
        prevSeenIdsRef.current = new Set(messages.map((m) => m.id));
        needsInitialSeedRef.current = false;
        requestAnimationFrame(() => {
          scrollToBottom();
        });
        return;
      }

      const seen = prevSeenIdsRef.current;
      const newMsgs = messages.filter((m) => !seen.has(m.id));
      for (const m of newMsgs) {
        seen.add(m.id);
      }

      if (newMsgs.length === 0) return;

      if (stickyRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
        return;
      }

      let incomingNew = 0;
      for (const m of newMsgs) {
        if (m.author !== sessionUserId) incomingNew++;
      }
      if (incomingNew > 0) {
        setUnreadBelow((c) => c + incomingNew);
      }
    },
    [scrollToBottom],
  );

  const scrollApi = useMemo(
    () => ({ notifyThreadMessagesSnapshot }),
    [notifyThreadMessagesSnapshot],
  );

  const trySend = useCallback(() => {
    if (!selectedChat || !selectedServer) return;
    const text = draft;
    if (!text.trim()) return;
    sendDesignerChatMessage(selectedChat.id, text, selectedServer.user.id);
    setDraft("");
    onComposerSent();
  }, [draft, selectedChat, selectedServer, onComposerSent]);

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

  const scrollBody = hasSelectedChat ? (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto p-4"
      onScroll={onScroll}
    >
      <div className="flex min-h-full flex-col justify-end">
        <ChatThreadScrollProvider value={scrollApi}>
          {children}
        </ChatThreadScrollProvider>
      </div>
    </div>
  ) : (
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
  );

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

      {scrollBody}

      {hasSelectedChat ? (
        <footer className="shrink-0 border-t border-base-300 bg-base-100 p-3">
          {!sticky ? (
            <div className="mb-2 flex flex-col items-end gap-1">
              {unreadBelow > 0 ? (
                <span className="badge badge-primary badge-sm tabular-nums">
                  +{unreadBelow}
                </span>
              ) : null}
              <button
                type="button"
                className={clsx(
                  "btn btn-ghost btn-sm shrink-0 border-2",
                  unreadBelow > 0
                    ? "border-primary text-primary"
                    : "border-base-300",
                )}
                onClick={jumpToBottom}
              >
                Вниз чата
              </button>
            </div>
          ) : null}
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={onComposerSubmit}
          >
            <label className="min-w-0 flex-1" htmlFor="designer-chat-composer">
              <span className="sr-only">Текст сообщения</span>
              <textarea
                ref={composerRef}
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
