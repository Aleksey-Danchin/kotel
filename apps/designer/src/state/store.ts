import { atom } from "jotai";
import { atomWithStorage } from "jotai/vanilla/utils";

import type { ServerSession } from "./servers";
import { serversAtom } from "./servers";
import stateMocks from "./mocks.json";

export type ChatId = string;

export interface ChatPreview {
  id: ChatId;
  title: string;
  subtitle: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

const SELECTED_SERVER_URL_STORAGE_KEY = "kotel.designer.activeServerUrl";
const SELECTED_CHAT_ID_STORAGE_KEY = "kotel.designer.selectedChatId";
const DEFAULT_SERVER_URL = "https://kotel.localhost";

// Список всех серверов из песочницы.
export const serversListAtom = atom((get) =>
  Array.from(get(serversAtom).values()),
);

// Выбранный сервер (persisted).
export const selectedServerUrlAtom = atomWithStorage<string | null>(
  SELECTED_SERVER_URL_STORAGE_KEY,
  DEFAULT_SERVER_URL,
);

type MockServer = { id: string; serverUrl: string };
type ServerChatLink = [serverId: string, chatId: string];
type ChatMessageLink = [chatId: string, messageId: string];

const MOCK_SERVERS = stateMocks.servers as MockServer[];
const MOCK_CHATS = stateMocks.chats as ChatPreview[];
const MOCK_MESSAGES = stateMocks.messages as ChatMessage[];
const SERVER_CHATS = stateMocks.serverChats as ServerChatLink[];
const CHAT_MESSAGES = stateMocks.chatMessages as ChatMessageLink[];

const CHAT_BY_ID = new Map(MOCK_CHATS.map((chat) => [chat.id, chat]));
const MESSAGE_BY_ID = new Map(MOCK_MESSAGES.map((message) => [message.id, message]));
const SERVER_ID_BY_URL = new Map(MOCK_SERVERS.map((server) => [server.serverUrl, server.id]));

export function getServerChats(serverId: string): ChatPreview[] {
  return SERVER_CHATS.filter(([linkServerId]) => linkServerId === serverId)
    .map(([, chatId]) => CHAT_BY_ID.get(chatId))
    .filter((chat): chat is ChatPreview => chat !== undefined);
}

/** Сумма полей unread по всем чатам сервера из моков (для бейджа в списке серверов). */
export function getTotalUnreadForServerSession(session: ServerSession): number {
  const serverId =
    SERVER_ID_BY_URL.get(session.serverUrl) ??
    session.id ??
    session.serverUrl;
  return getServerChats(serverId).reduce((sum, chat) => chat.unread + sum, 0);
}

export function getChatMessages(chatId: string): ChatMessage[] {
  return CHAT_MESSAGES.filter(([linkChatId]) => linkChatId === chatId)
    .map(([, messageId]) => MESSAGE_BY_ID.get(messageId))
    .filter((message): message is ChatMessage => message !== undefined);
}

// “Разрешенный” выбранный сервер:
// - null в storage — явно «ничего не выбрано» (например после Escape)
// - иначе URL из storage, если он есть в списке подключённых
// - иначе null (не подставляем первый сервер автоматически)
export const resolvedSelectedServerUrlAtom = atom((get) => {
  const serversMap = get(serversAtom);
  const storageValue = get(selectedServerUrlAtom);

  if (storageValue == null || storageValue === "") {
    return null;
  }

  if (serversMap.has(storageValue)) {
    return storageValue;
  }

  return null;
});

export const selectedServerAtom = atom((get) => {
  const resolvedServerUrl = get(resolvedSelectedServerUrlAtom);
  if (!resolvedServerUrl) return null;
  return get(serversAtom).get(resolvedServerUrl) ?? null;
});

// Список чатов для выбранного (resolved) сервера.
export const chatsForSelectedServerAtom = atom((get) => {
  const selectedServer = get(selectedServerAtom);
  if (!selectedServer) return [];

  // Сначала id из каталога моков по URL — иначе persist/session могут дать
  // makeServerId(url) вроде srv_https_…, а serverChats привязаны к srv_main и т.д.
  const serverId =
    SERVER_ID_BY_URL.get(selectedServer.serverUrl) ??
    selectedServer.id ??
    selectedServer.serverUrl;
  return getServerChats(serverId);
});

// Выбранный чат (persisted).
export const selectedChatIdAtom = atomWithStorage<ChatId | null>(
  SELECTED_CHAT_ID_STORAGE_KEY,
  null,
);

// “Разрешенный” выбранный чат:
// - если storage-chatId присутствует в текущем списке, используем его
// - иначе показываем первый чат
export const resolvedSelectedChatIdAtom = atom((get) => {
  const chats = get(chatsForSelectedServerAtom);
  if (chats.length === 0) return null;

  const storageValue = get(selectedChatIdAtom);
  if (storageValue && chats.some((c) => c.id === storageValue)) {
    return storageValue;
  }

  return null;
});

export const selectedChatAtom = atom((get) => {
  const resolvedSelectedChatId = get(resolvedSelectedChatIdAtom);
  if (!resolvedSelectedChatId) return null;

  const chats = get(chatsForSelectedServerAtom);
  return chats.find((c) => c.id === resolvedSelectedChatId) ?? null;
});

// (намеренно не экспортируем дополнительный отдельный store):
// используйте базовый `defaultStore` (Jotai) по умолчанию.
