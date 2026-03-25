import { atom } from "jotai";

import { defaultStore } from "../global/defaultStore";
import stateMocks from "./mocks.json";

export interface ServerUser {
  id: string;
  fullname: string;
  login: string;
  role: string;
}

export interface ServerSession {
  id?: string;
  serverUrl: string;
  user: ServerUser;
}

const SERVERS_STORAGE_KEY = "kotel.designer.servers";
const ACTIVE_SERVER_STORAGE_KEY = "kotel.designer.activeServerUrl";

const DESIGNER_DEFAULT_SERVERS = stateMocks.servers as ServerSession[];

function makeServerId(serverUrl: string): string {
  return `srv_${serverUrl.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
}

function normalizeServerSession(session: ServerSession): ServerSession {
  return {
    ...session,
    id: session.id ?? makeServerId(session.serverUrl),
  };
}

function loadPersistedServers(): ServerSession[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  const rawValue = localStorage.getItem(SERVERS_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is ServerSession => {
        return (
          value &&
          typeof value === "object" &&
          typeof (value as ServerSession).serverUrl === "string" &&
          typeof (value as ServerSession).user === "object" &&
          typeof (value as ServerSession).user?.id === "string"
        );
      })
      .map(normalizeServerSession);
  } catch {
    return [];
  }
}

function loadPersistedActiveServerUrl(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const rawValue = localStorage.getItem(ACTIVE_SERVER_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  return rawValue.trim().length ? rawValue : null;
}

function persist(
  servers: Map<string, ServerSession>,
  activeServerUrl: string | null,
): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    SERVERS_STORAGE_KEY,
    JSON.stringify(Array.from(servers.values())),
  );
  localStorage.setItem(ACTIVE_SERVER_STORAGE_KEY, activeServerUrl ?? "");
}

const initialSessions = loadPersistedServers();
const designerDefaults = DESIGNER_DEFAULT_SERVERS.map(normalizeServerSession);

// По умолчанию всегда держим “базовый набор” серверов (как раньше делали в `~__root.tsx`),
// а persisted-данные поверх них приоритетнее.
const initialSessionsByUrl = new Map<string, ServerSession>();
designerDefaults.forEach((s) => initialSessionsByUrl.set(s.serverUrl, s));
initialSessions.forEach((s) => initialSessionsByUrl.set(s.serverUrl, s));

const initialActiveServerUrl = (() => {
  const persisted = loadPersistedActiveServerUrl();
  if (persisted && initialSessionsByUrl.has(persisted)) {
    return persisted;
  }

  return designerDefaults[0]?.serverUrl ?? null;
})();

export const serversAtom = atom<Map<string, ServerSession>>(
  new Map(Array.from(initialSessionsByUrl.values()).map((s) => [s.serverUrl, s])),
);

export const activeServerUrlAtom = atom<string | null>(initialActiveServerUrl);

export function setServerSession(session: ServerSession): void {
  const normalizedSession = normalizeServerSession(session);
  const currentServers = defaultStore.get(serversAtom);
  const nextServers = new Map(currentServers);
  nextServers.set(normalizedSession.serverUrl, normalizedSession);

  const currentActive = defaultStore.get(activeServerUrlAtom);
  const nextActive = currentActive ?? normalizedSession.serverUrl;

  defaultStore.set(serversAtom, nextServers);
  defaultStore.set(activeServerUrlAtom, nextActive);
  persist(nextServers, nextActive);
}

export function removeServerSession(serverUrl: string): void {
  const currentServers = defaultStore.get(serversAtom);
  if (!currentServers.has(serverUrl)) {
    return;
  }

  const nextServers = new Map(currentServers);
  nextServers.delete(serverUrl);

  const currentActive = defaultStore.get(activeServerUrlAtom);
  const nextActive =
    currentActive === serverUrl
      ? (nextServers.keys().next().value ?? null)
      : currentActive;

  defaultStore.set(serversAtom, nextServers);
  defaultStore.set(activeServerUrlAtom, nextActive);
  persist(nextServers, nextActive);
}

export function setActiveServer(serverUrl: string | null): void {
  const currentServers = defaultStore.get(serversAtom);
  if (serverUrl === null) {
    defaultStore.set(activeServerUrlAtom, null);
    persist(currentServers, null);
    return;
  }

  const exists = currentServers.has(serverUrl);
  const next = exists ? serverUrl : null;
  defaultStore.set(activeServerUrlAtom, next);
  persist(currentServers, next);
}

export function resetServersStore(): void {
  defaultStore.set(serversAtom, new Map());
  defaultStore.set(activeServerUrlAtom, null);
  persist(new Map(), null);
}
