import { atom, createStore } from "jotai";

export interface ServerUser {
  id: string;
  fullname: string;
  login: string;
  role: string;
}

export interface ServerSession {
  serverUrl: string;
  user: ServerUser;
}

const SERVERS_STORAGE_KEY = "kotel.designer.servers";
const ACTIVE_SERVER_STORAGE_KEY = "kotel.designer.activeServerUrl";

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

    return parsed.filter((value): value is ServerSession => {
      return (
        value &&
        typeof value === "object" &&
        typeof (value as ServerSession).serverUrl === "string" &&
        typeof (value as ServerSession).user === "object" &&
        typeof (value as ServerSession).user?.id === "string"
      );
    });
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

function persist(servers: Map<string, ServerSession>, activeServerUrl: string | null): void {
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
const initialActiveServerUrl = loadPersistedActiveServerUrl();

export const serversAtom = atom<Map<string, ServerSession>>(
  new Map(initialSessions.map((s) => [s.serverUrl, s])),
);

export const activeServerUrlAtom = atom<string | null>(initialActiveServerUrl);

export const serversStore = createStore();

export function setServerSession(session: ServerSession): void {
  const currentServers = serversStore.get(serversAtom);
  const nextServers = new Map(currentServers);
  nextServers.set(session.serverUrl, session);

  const currentActive = serversStore.get(activeServerUrlAtom);
  const nextActive = currentActive ?? session.serverUrl;

  serversStore.set(serversAtom, nextServers);
  serversStore.set(activeServerUrlAtom, nextActive);
  persist(nextServers, nextActive);
}

export function removeServerSession(serverUrl: string): void {
  const currentServers = serversStore.get(serversAtom);
  if (!currentServers.has(serverUrl)) {
    return;
  }

  const nextServers = new Map(currentServers);
  nextServers.delete(serverUrl);

  const currentActive = serversStore.get(activeServerUrlAtom);
  const nextActive =
    currentActive === serverUrl ? nextServers.keys().next().value ?? null : currentActive;

  serversStore.set(serversAtom, nextServers);
  serversStore.set(activeServerUrlAtom, nextActive);
  persist(nextServers, nextActive);
}

export function setActiveServer(serverUrl: string | null): void {
  const currentServers = serversStore.get(serversAtom);
  if (serverUrl === null) {
    serversStore.set(activeServerUrlAtom, null);
    persist(currentServers, null);
    return;
  }

  const exists = currentServers.has(serverUrl);
  const next = exists ? serverUrl : null;
  serversStore.set(activeServerUrlAtom, next);
  persist(currentServers, next);
}

export function resetServersStore(): void {
  serversStore.set(serversAtom, new Map());
  serversStore.set(activeServerUrlAtom, null);
  persist(new Map(), null);
}

