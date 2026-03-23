import { atom, createStore } from "jotai";

export interface ServerUser {
  id: string;
  fullname: string;
  login: string;
  role: string;
}

export interface ServerSession {
  serverUrl: string;
  sessionId: string;
  user: ServerUser;
}

const SERVERS_STORAGE_KEY = "kotel.servers";

function saveServerUrls(serverUrls: string[]): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(SERVERS_STORAGE_KEY, JSON.stringify(serverUrls));
}

export function getPersistedServerUrls(): string[] {
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

    return parsed.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export const serversAtom = atom<Map<string, ServerSession>>(new Map());
export const activeServerUrlAtom = atom<string | null>(null);
export const activeSessionAtom = atom((get) => {
  const serverUrl = get(activeServerUrlAtom);
  if (!serverUrl) {
    return null;
  }

  return get(serversAtom).get(serverUrl) ?? null;
});

export const serversStore = createStore();

export function setServerSession(session: ServerSession): void {
  const currentServers = serversStore.get(serversAtom);
  const nextServers = new Map(currentServers);
  nextServers.set(session.serverUrl, session);
  serversStore.set(serversAtom, nextServers);
  saveServerUrls(Array.from(nextServers.keys()));

  if (!serversStore.get(activeServerUrlAtom)) {
    serversStore.set(activeServerUrlAtom, session.serverUrl);
  }
}

export function removeServerSession(serverUrl: string): void {
  const currentServers = serversStore.get(serversAtom);
  if (!currentServers.has(serverUrl)) {
    return;
  }

  const nextServers = new Map(currentServers);
  nextServers.delete(serverUrl);
  serversStore.set(serversAtom, nextServers);
  saveServerUrls(Array.from(nextServers.keys()));

  if (serversStore.get(activeServerUrlAtom) === serverUrl) {
    const [nextActiveServer] = nextServers.keys();
    serversStore.set(activeServerUrlAtom, nextActiveServer ?? null);
  }
}

export function setActiveServer(serverUrl: string | null): void {
  if (serverUrl === null) {
    serversStore.set(activeServerUrlAtom, null);
    return;
  }

  const exists = serversStore.get(serversAtom).has(serverUrl);
  serversStore.set(activeServerUrlAtom, exists ? serverUrl : null);
}

export function resetServersStore(): void {
  serversStore.set(serversAtom, new Map());
  serversStore.set(activeServerUrlAtom, null);
  saveServerUrls([]);
}
