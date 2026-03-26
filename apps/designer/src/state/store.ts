import { atom } from "jotai";

import { defaultStore } from "../global/defaultStore";
import { activeServerIdAtom, lastChatByServerIdAtom } from "./selectionAtoms";
import type { ServerSession } from "./servers";
import { serversAtom } from "./servers";
import stateMocks from "./mocks.json";
import { serverUrlFromServersByRouteId } from "./serverRouteId";

export type ChatId = string;

/** Тип чата в макете: личный (peer) или группа/канал. Notes для песочницы: бэкенд не подключён. */
export type ChatType = "person" | "group";

export interface ChatPreview {
  id: ChatId;
  type: ChatType;
  title: string;
  subtitle: string;
  unread: number;
  /** Для `type: "person"` — имя собеседника в шапке; для группы не задаётся. */
  peerName?: string;
}

/**
 * userId — id пользователя сессии мок-сервера (`ServerSession.user.id`) или id «собеседника»
 * из фиктивного каталога; совпадение с текущей сессией задаёт исходящее направление.
 */
export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

/** Заголовок колонки чата: имя пира для личного чата, иначе название группы. */
export function chatHeaderTitle(chat: ChatPreview): string {
  if (chat.type === "person" && chat.peerName) {
    return chat.peerName;
  }
  return chat.title;
}

/** Текущий сегмент маршрута: либо главная без id, либо `/$id`. */
export const routeContextAtom = atom<
  { type: "index" } | { type: "id"; id: string }
>({ type: "index" });

/** Идёт ли временная имитация загрузки треда при переходах внутри `/$id`. */
export const threadTransitionLoadingAtom = atom(false);

type MockServer = { id: string; serverUrl: string };
export type MockUser = {
  id: string;
  fullname: string;
  login: string;
  role: string;
  password?: string;
  blocked?: boolean;
  requestFrequency?: number;
  isOnline: boolean;
  lastSeenAt: string;
};
type MockSession = { id: string; serverId: string; createdAt: string };
type ServerChatLink = [serverId: string, chatId: string];
type ChatMessageLink = [chatId: string, messageId: string];
type ServerUserLink = [serverId: string, userId: string];

const MOCK_SERVERS = stateMocks.servers as MockServer[];
const MOCK_USERS = stateMocks.users as MockUser[];
const MOCK_SESSIONS = stateMocks.sessions as MockSession[];
const MOCK_CHATS = stateMocks.chats as ChatPreview[];
const MOCK_MESSAGES = stateMocks.messages as ChatMessage[];
const SERVER_CHATS = stateMocks.serverChats as ServerChatLink[];
const CHAT_MESSAGES = stateMocks.chatMessages as ChatMessageLink[];
const SERVER_USERS = stateMocks.serverUsers as ServerUserLink[];

const CHAT_BY_ID = new Map(MOCK_CHATS.map((chat) => [chat.id, chat]));
const MESSAGE_BY_ID = new Map(
  MOCK_MESSAGES.map((message) => [message.id, message]),
);
const SERVER_ID_BY_URL = new Map(
  MOCK_SERVERS.map((server) => [server.serverUrl, server.id]),
);
const USER_BY_ID = new Map(MOCK_USERS.map((user) => [user.id, user]));
const PERSON_CHAT_BY_SERVER_AND_PEER = new Map<string, string>();

function normalizeMockUser(user: MockUser): MockUser {
  return {
    ...user,
    password: user.password ?? "",
    blocked: user.blocked ?? false,
    requestFrequency: user.requestFrequency ?? 0,
  };
}

function personChatKey(serverId: string, peerUserId: string): string {
  return `${serverId}:${peerUserId}`;
}

function seedPersonChatRegistry(): void {
  for (const [serverId, chatId] of SERVER_CHATS) {
    const chat = CHAT_BY_ID.get(chatId);
    if (!chat || chat.type !== "person") continue;
    const peerByName = MOCK_USERS.find((user) => user.fullname === chat.peerName);
    if (!peerByName) continue;
    PERSON_CHAT_BY_SERVER_AND_PEER.set(
      personChatKey(serverId, peerByName.id),
      chat.id,
    );
  }
}

seedPersonChatRegistry();

export function getServerChats(serverId: string): ChatPreview[] {
  return SERVER_CHATS.filter(([linkServerId]) => linkServerId === serverId)
    .map(([, chatId]) => CHAT_BY_ID.get(chatId))
    .filter((chat): chat is ChatPreview => chat !== undefined);
}

/** Сумма полей unread по всем чатам сервера из моков (для бейджа в списке серверов). */
export function getTotalUnreadForServerSession(session: ServerSession): number {
  const serverId =
    SERVER_ID_BY_URL.get(session.serverUrl) ?? session.id ?? session.serverUrl;
  return getServerChats(serverId).reduce((sum, chat) => chat.unread + sum, 0);
}

export function getChatMessages(chatId: string): ChatMessage[] {
  const list = CHAT_MESSAGES.filter(([linkChatId]) => linkChatId === chatId)
    .map(([, messageId]) => MESSAGE_BY_ID.get(messageId))
    .filter((message): message is ChatMessage => message !== undefined);
  return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getUsersForServer(
  serverId: string,
  currentUserId: string | null,
): MockUser[] {
  return SERVER_USERS.filter(([linkServerId]) => linkServerId === serverId)
    .map(([, userId]) => USER_BY_ID.get(userId))
    .filter((user): user is MockUser => user !== undefined)
    .map(normalizeMockUser)
    .filter((user) => user.id !== currentUserId);
}

export function getServerUsers(serverId: string): MockUser[] {
  return SERVER_USERS.filter(([linkServerId]) => linkServerId === serverId)
    .map(([, userId]) => USER_BY_ID.get(userId))
    .filter((user): user is MockUser => user !== undefined)
    .map(normalizeMockUser);
}

export function resolveCatalogServerId(session: ServerSession): string {
  return (
    SERVER_ID_BY_URL.get(session.serverUrl) ?? session.id ?? session.serverUrl
  );
}

function nextUserId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `mock-user-${crypto.randomUUID()}`;
  }
  return `mock-user-${Date.now()}`;
}

export interface UpdateServerUserInput {
  id: string;
  login: string;
  fullname: string;
  password: string;
  blocked: boolean;
  role: string;
}

export interface CreateServerUserInput {
  serverId: string;
  login: string;
  fullname: string;
  password: string;
}

export const usersDataRevisionAtom = atom(0);

function bumpUsersDataRevision(): void {
  const revision = defaultStore.get(usersDataRevisionAtom);
  defaultStore.set(usersDataRevisionAtom, revision + 1);
}

export function updateServerUser(input: UpdateServerUserInput): void {
  const target = USER_BY_ID.get(input.id);
  if (!target) {
    return;
  }

  target.login = input.login;
  target.fullname = input.fullname;
  target.password = input.password;
  target.blocked = input.blocked;
  target.role = input.role;

  bumpUsersDataRevision();
}

export function createServerUser(input: CreateServerUserInput): MockUser {
  const created = normalizeMockUser({
    id: nextUserId(),
    login: input.login,
    fullname: input.fullname,
    password: input.password,
    role: "USER",
    blocked: false,
    requestFrequency: 0,
    isOnline: false,
    lastSeenAt: new Date().toISOString(),
  });

  MOCK_USERS.push(created);
  USER_BY_ID.set(created.id, created);
  SERVER_USERS.push([input.serverId, created.id]);
  bumpUsersDataRevision();

  return created;
}

export function getSessionsForServer(serverId: string): MockSession[] {
  return MOCK_SESSIONS.filter((session) => session.serverId === serverId);
}

export function resolvePersonChatPeer(
  chat: ChatPreview,
  users: MockUser[],
): MockUser | null {
  if (chat.type !== "person") return null;
  const byPeerName = users.find((user) => user.fullname === chat.peerName);
  if (byPeerName) return byPeerName;
  return users.find((user) => user.fullname === chat.title) ?? null;
}

function newPersonChatId(serverId: string, peerUserId: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `chat_person_${serverId}_${peerUserId}_${crypto.randomUUID()}`;
  }
  return `chat_person_${serverId}_${peerUserId}_${Date.now()}`;
}

export function findOrCreatePersonChat(
  serverId: string,
  peerUserId: string,
): ChatPreview | null {
  const peerUser = USER_BY_ID.get(peerUserId);
  if (!peerUser) return null;

  const byRegistry = PERSON_CHAT_BY_SERVER_AND_PEER.get(
    personChatKey(serverId, peerUserId),
  );
  if (byRegistry) {
    return CHAT_BY_ID.get(byRegistry) ?? null;
  }

  const existing = getServerChats(serverId).find(
    (chat) =>
      chat.type === "person" &&
      (chat.peerName === peerUser.fullname || chat.title === peerUser.fullname),
  );
  if (existing) {
    PERSON_CHAT_BY_SERVER_AND_PEER.set(
      personChatKey(serverId, peerUserId),
      existing.id,
    );
    return existing;
  }

  const created: ChatPreview = {
    id: newPersonChatId(serverId, peerUserId),
    type: "person",
    title: peerUser.fullname,
    peerName: peerUser.fullname,
    subtitle: `Личные сообщения · ${peerUser.login}`,
    unread: 0,
  };

  MOCK_CHATS.push(created);
  CHAT_BY_ID.set(created.id, created);
  SERVER_CHATS.push([serverId, created.id]);
  PERSON_CHAT_BY_SERVER_AND_PEER.set(
    personChatKey(serverId, peerUserId),
    created.id,
  );
  return created;
}

// Список всех серверов из песочницы.
export const serversListAtom = atom((get) =>
  Array.from(get(serversAtom).values()),
);

export type RouteResolution =
  | { kind: "unknown" }
  | { kind: "server"; serverUrl: string }
  | { kind: "chat"; serverUrl: string; chatId: string };

function catalogServerId(session: ServerSession): string {
  return resolveCatalogServerId(session);
}

function pickServerUrlForChat(
  chatId: string,
  serversMap: Map<string, ServerSession>,
  preferredServerRouteId: string | null,
): string | null {
  const matching: string[] = [];
  for (const session of serversMap.values()) {
    const sid = catalogServerId(session);
    const chats = getServerChats(sid);
    if (chats.some((c) => c.id === chatId)) {
      matching.push(session.serverUrl);
    }
  }
  if (matching.length === 0) return null;
  if (preferredServerRouteId) {
    const prefUrl = serverUrlFromServersByRouteId(
      serversMap,
      preferredServerRouteId,
    );
    if (prefUrl && matching.includes(prefUrl)) {
      return prefUrl;
    }
  }
  return matching[0] ?? null;
}

export function resolveRouteParam(
  routeId: string,
  serversMap: Map<string, ServerSession>,
  preferredServerRouteId: string | null,
): RouteResolution {
  if (CHAT_BY_ID.has(routeId)) {
    const serverUrl = pickServerUrlForChat(
      routeId,
      serversMap,
      preferredServerRouteId,
    );
    if (!serverUrl) return { kind: "unknown" };
    return { kind: "chat", serverUrl, chatId: routeId };
  }

  const serverUrl = serverUrlFromServersByRouteId(serversMap, routeId);
  if (serverUrl) return { kind: "server", serverUrl };
  return { kind: "unknown" };
}

export const selectedServerAtom = atom((get) => {
  const ctx = get(routeContextAtom);
  const serversMap = get(serversAtom);
  const activeId = get(activeServerIdAtom);

  if (ctx.type === "id") {
    const r = resolveRouteParam(ctx.id, serversMap, activeId);
    if (r.kind === "unknown") return null;
    return serversMap.get(r.serverUrl) ?? null;
  }

  if (!activeId) return null;
  const url = serverUrlFromServersByRouteId(serversMap, activeId);
  if (!url) return null;
  return serversMap.get(url) ?? null;
});

// Список чатов для выбранного (resolved) сервера.
export const chatsForSelectedServerAtom = atom((get) => {
  const selectedServer = get(selectedServerAtom);
  if (!selectedServer) return [];

  const serverId = catalogServerId(selectedServer);
  return getServerChats(serverId);
});

export const usersForSelectedServerAtom = atom((get) => {
  const selectedServer = get(selectedServerAtom);
  if (!selectedServer) return [];
  const serverId = catalogServerId(selectedServer);
  return getUsersForServer(serverId, selectedServer.user.id);
});

export const allUsersForSelectedServerAtom = atom((get) => {
  const selectedServer = get(selectedServerAtom);
  if (!selectedServer) return [];
  const serverId = catalogServerId(selectedServer);
  return getServerUsers(serverId);
});

export const sessionsForSelectedServerAtom = atom((get) => {
  const selectedServer = get(selectedServerAtom);
  if (!selectedServer) return [];
  const serverId = catalogServerId(selectedServer);
  return getSessionsForServer(serverId);
});

export const selectedPersonChatPeerAtom = atom((get) => {
  const selectedChat = get(selectedChatAtom);
  const users = get(usersForSelectedServerAtom);
  if (!selectedChat) return null;
  return resolvePersonChatPeer(selectedChat, users);
});

/** Эффективный открытый чат согласно маршруту и lastChatByServerId. */
export const effectiveChatIdAtom = atom((get) => {
  const ctx = get(routeContextAtom);
  const serversMap = get(serversAtom);
  const activeId = get(activeServerIdAtom);
  const lastMap = get(lastChatByServerIdAtom);
  const chats = get(chatsForSelectedServerAtom);

  if (ctx.type === "id") {
    const r = resolveRouteParam(ctx.id, serversMap, activeId);
    if (r.kind === "unknown") return null;
    if (r.kind === "chat") return r.chatId;

    const last = lastMap[ctx.id];
    if (last && chats.some((c) => c.id === last)) {
      return last;
    }
    return null;
  }

  return null;
});

export const selectedChatAtom = atom((get) => {
  const chatId = get(effectiveChatIdAtom);
  if (!chatId) return null;

  const chats = get(chatsForSelectedServerAtom);
  return chats.find((c) => c.id === chatId) ?? null;
});
