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
}
