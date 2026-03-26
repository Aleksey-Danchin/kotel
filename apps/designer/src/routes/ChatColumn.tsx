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
import { FaArrowDownLong } from "react-icons/fa6";
import { GrSend } from "react-icons/gr";

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
  selectedPersonChatPeerAtom,
  selectedServerAtom,
  threadTransitionLoadingAtom,
} from "../state/store";

export interface ChatColumnProps {
  children: ReactNode;
  isLoading?: boolean;
}

/** Личный чат: в данных `title` — имя собеседника; группа/канал: `title` — название. */
export function ChatColumn({ children, isLoading = false }: ChatColumnProps) {
  const selectedChat = useAtomValue(selectedChatAtom);
  const selectedPersonChatPeer = useAtomValue(selectedPersonChatPeerAtom);
  const selectedServer = useAtomValue(selectedServerAtom);
  const threadTransitionLoading = useAtomValue(threadTransitionLoadingAtom);
  const hasSelectedChat = Boolean(selectedChat && selectedServer);
  const showSkeletonComposer =
    Boolean(selectedServer) && !hasSelectedChat && threadTransitionLoading;
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [sticky, setSticky] = useState(true);
  const stickyRef = useRef(true);
  const [unreadBelow, setUnreadBelow] = useState(0);
  const prevSeenIdsRef = useRef<Set<string>>(new Set());
  const needsInitialSeedRef = useRef(true);
  const scrollInnerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // When messages arrive or render is still settling (layout shifts),
  // a single rAF can be too early; do it twice to land at the true bottom.
  const scrollToBottomStable = useCallback(() => {
    requestAnimationFrame(() => {
      scrollToBottom();
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  }, [scrollToBottom]);

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
    // Start from bottom even before the first message snapshot arrives.
    // Two-frame settling avoids "scroll bar jumps to top" on large threads.
    scrollToBottomStable();
  }, [hasSelectedChat, selectedChatId, scrollToBottomStable]);

  useLayoutEffect(() => {
    if (!hasSelectedChat || !selectedChatId) return;
    composerRef.current?.focus();
  }, [hasSelectedChat, selectedChatId]);

  // Пока тред растёт (скелетон → сообщения, ленивый layout), держим низ при липком режиме.
  useLayoutEffect(() => {
    if (!hasSelectedChat || !selectedChatId) return;
    const inner = scrollInnerRef.current;
    if (!inner) return;

    const ro = new ResizeObserver(() => {
      if (!stickyRef.current) return;
      requestAnimationFrame(() => {
        if (!stickyRef.current) return;
        scrollToBottom();
      });
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [hasSelectedChat, selectedChatId, scrollToBottom]);

  const syncThreadScrollToBottom = useCallback(() => {
    setSticky(true);
    stickyRef.current = true;
    setUnreadBelow(0);
    scrollToBottomStable();
  }, [scrollToBottomStable]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // While we haven't seeded initial "at bottom" yet, don't flip sticky based on
    // intermediate scroll metrics (message list may still be growing).
    if (needsInitialSeedRef.current) return;

    const atBottom = isNearBottom(el, DESIGNER_CHAT_STICKY_THRESHOLD_PX);
    setSticky(atBottom);
    if (atBottom) setUnreadBelow(0);
  }, []);

  const onComposerSent = useCallback(() => {
    setSticky(true);
    stickyRef.current = true;
    setUnreadBelow(0);
    requestAnimationFrame(() => {
      scrollToBottomStable();
      composerRef.current?.focus();
    });
  }, [scrollToBottomStable]);

  const jumpToBottom = useCallback(() => {
    setSticky(true);
    stickyRef.current = true;
    setUnreadBelow(0);
    scrollToBottomStable();
  }, [scrollToBottomStable]);

  const notifyThreadMessagesSnapshot = useCallback(
    (messages: ChatMessage[], sessionUserId: string) => {
      if (needsInitialSeedRef.current) {
        prevSeenIdsRef.current = new Set(messages.map((m) => m.id));
        needsInitialSeedRef.current = false;
        setSticky(true);
        stickyRef.current = true;
        setUnreadBelow(0);
        scrollToBottomStable();
        return;
      }

      const seen = prevSeenIdsRef.current;
      const newMsgs = messages.filter((m) => !seen.has(m.id));
      for (const m of newMsgs) {
        seen.add(m.id);
      }

      if (newMsgs.length === 0) return;

      if (stickyRef.current) {
        scrollToBottomStable();
        return;
      }

      let incomingNew = 0;
      for (const m of newMsgs) {
        if (m.userId !== sessionUserId) incomingNew++;
      }
      if (incomingNew > 0) {
        setUnreadBelow((c) => c + incomingNew);
      }
    },
    [scrollToBottomStable],
  );

  const scrollApi = useMemo(
    () => ({
      notifyThreadMessagesSnapshot,
      syncThreadScrollToBottom,
    }),
    [notifyThreadMessagesSnapshot, syncThreadScrollToBottom],
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
      className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-4"
      onScroll={onScroll}
    >
      <div
        ref={scrollInnerRef}
        className="flex min-h-full flex-col justify-end"
      >
        {/* Ширина треда и композера — крутите max-w-[…px] (дублируйте то же число в ChatMessageList). */}
        <div className="mx-auto w-full max-w-[600px] px-3">
          <ChatThreadScrollProvider value={scrollApi}>
            {children}
          </ChatThreadScrollProvider>
        </div>
      </div>
    </div>
  ) : (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-4">
      <div className="flex min-h-full flex-col justify-end">
        {/* Держим ту же ширину треда, что и в режиме выбранного чата. */}
        <div className="mx-auto w-full max-w-[600px] px-3">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-l-2 border-base-content/20 bg-base-100">
      {hasSelectedChat ? (
        <header className="shrink-0 min-h-12 border-b border-base-300 bg-base-300 px-2">
          <div className="flex h-full items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-lg font-semibold text-base-content">
                {selectedChat?.type === "person" ? (
                  <span
                    className={
                      selectedPersonChatPeer?.isOnline
                        ? "h-2.5 w-2.5 shrink-0 rounded-full bg-success"
                        : "h-2.5 w-2.5 shrink-0 rounded-full bg-base-content/30"
                    }
                    aria-label={
                      selectedPersonChatPeer?.isOnline ? "В сети" : "Не в сети"
                    }
                    title={
                      selectedPersonChatPeer?.isOnline ? "В сети" : "Не в сети"
                    }
                  />
                ) : null}
                <span className="truncate">{chatHeaderTitle(selectedChat!)}</span>
              </h1>
            </div>
            <ColumnHeaderGear />
          </div>
        </header>
      ) : null}

      {scrollBody}

      {hasSelectedChat ? (
        <footer className="relative z-10 shrink-0 border-t border-base-300 bg-base-100 py-3">
          {/* Ширина треда и композера — крутите max-w-[…px] (дублируйте то же число в ChatMessageList). */}
          <div className="mx-auto w-full max-w-[600px] px-3">
            <form
              className="relative flex flex-col items-center gap-2 sm:flex-row sm:items-center"
              onSubmit={onComposerSubmit}
            >
              <label
                className="min-w-0 flex-1"
                htmlFor="designer-chat-composer"
              >
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
              <div className="relative flex shrink-0 flex-col items-center">
                {!sticky ? (
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 flex-col items-center gap-1 drop-shadow-md"
                    role="presentation"
                  >
                    {unreadBelow > 0 ? (
                      <span className="badge badge-primary badge-sm pointer-events-auto tabular-nums">
                        +{unreadBelow}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-xl btn-circle btn-primary shrink-0 border-2 pointer-events-auto"
                      onClick={jumpToBottom}
                    >
                      <FaArrowDownLong />
                    </button>
                  </div>
                ) : null}
                <button
                  type="submit"
                  className="btn btn-primary shrink-0 btn-circle btn-xl"
                  disabled={!selectedChat || !selectedServer}
                >
                  <GrSend />
                </button>
              </div>
            </form>
          </div>
        </footer>
      ) : showSkeletonComposer ? (
        <footer className="shrink-0 border-t border-base-300 bg-base-100 py-3">
          <div className="mx-auto w-full max-w-[600px] px-3">
            <form className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1" aria-hidden="true">
                <span className="sr-only">Текст сообщения</span>
                <div className="skeleton h-16 w-full rounded-box" />
              </label>
              <div
                className="skeleton h-12 w-12 shrink-0 rounded-full"
                aria-hidden="true"
              />
            </form>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
