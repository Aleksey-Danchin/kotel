import { atom } from "jotai";

import { defaultStore } from "../global/defaultStore";
import type { ChatMessage } from "./store";
import { getChatMessages } from "./store";

/** Задержка авто-ответа в песочнице (мс). */
export const DESIGNER_CHAT_AUTOREPLY_MS = 2000;

const AUTOREPLY_FALLBACK_USER_ID = "designer-autoreply-peer";

export const designerAppendedChatMessagesAtom = atom<
  Record<string, ChatMessage[]>
>({});

function newDesignerMessageId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getMergedChatMessages(
  chatId: string,
  appendedByChat: Record<string, ChatMessage[]>,
): ChatMessage[] {
  const base = getChatMessages(chatId);
  const extra = appendedByChat[chatId] ?? [];
  return [...base, ...extra].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

function pickAutoReplyUserId(
  chatId: string,
  sessionUserId: string,
  appendedBeforeOutgoing: Record<string, ChatMessage[]>,
): string {
  const merged = getMergedChatMessages(chatId, appendedBeforeOutgoing);
  const peer = merged.find((m) => m.userId !== sessionUserId);
  return peer?.userId ?? AUTOREPLY_FALLBACK_USER_ID;
}

/**
 * Добавляет исходящее сообщение в текущий чат и через ~2 с — входящий дубликат текста.
 * Пустая строка после trim не отправляется.
 */
export function sendDesignerChatMessage(
  chatId: string,
  rawText: string,
  sessionUserId: string,
): void {
  const trimmed = rawText.trim();
  if (!trimmed) return;

  const snapshot = defaultStore.get(designerAppendedChatMessagesAtom);
  const replyUserId = pickAutoReplyUserId(chatId, sessionUserId, snapshot);

  const outgoing: ChatMessage = {
    id: newDesignerMessageId("out"),
    userId: sessionUserId,
    text: trimmed,
    createdAt: new Date().toISOString(),
  };

  defaultStore.set(designerAppendedChatMessagesAtom, (prev) => ({
    ...prev,
    [chatId]: [...(prev[chatId] ?? []), outgoing],
  }));

  globalThis.setTimeout(() => {
    const incoming: ChatMessage = {
      id: newDesignerMessageId("in"),
      userId: replyUserId,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    defaultStore.set(designerAppendedChatMessagesAtom, (prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] ?? []), incoming],
    }));
  }, DESIGNER_CHAT_AUTOREPLY_MS);
}
