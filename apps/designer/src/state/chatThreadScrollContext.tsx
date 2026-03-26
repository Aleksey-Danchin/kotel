import { createContext, useContext, type ReactNode } from "react";

import type { ChatMessage } from "./store";

export type ChatThreadScrollContextValue = {
  getScrollElement: () => HTMLDivElement | null;
  notifyThreadMessagesSnapshot: (
    messages: ChatMessage[],
    sessionUserId: string,
  ) => void;
  /** После скелетона/смены контента — прокрутить к низу и вернуть липкий режим. */
  syncThreadScrollToBottom: () => void;
};

const ChatThreadScrollContext =
  createContext<ChatThreadScrollContextValue | null>(null);

export function ChatThreadScrollProvider({
  value,
  children,
}: {
  value: ChatThreadScrollContextValue;
  children: ReactNode;
}) {
  return (
    <ChatThreadScrollContext.Provider value={value}>
      {children}
    </ChatThreadScrollContext.Provider>
  );
}

export function useChatThreadScroll(): ChatThreadScrollContextValue | null {
  return useContext(ChatThreadScrollContext);
}
