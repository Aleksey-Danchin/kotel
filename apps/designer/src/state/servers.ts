import { atom } from "jotai";

import { defaultStore } from "../global/defaultStore";
import { activeServerIdAtom } from "./selectionAtoms";
import { serverRouteIdFromServerUrl } from "./serverRouteId";
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

function persistServers(servers: Map<string, ServerSession>): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    SERVERS_STORAGE_KEY,
    JSON.stringify(Array.from(servers.values())),
  );
}

const initialSessions = loadPersistedServers();
const designerDefaults = DESIGNER_DEFAULT_SERVERS.map(normalizeServerSession);

const initialSessionsByUrl = new Map<string, ServerSession>();
designerDefaults.forEach((s) => initialSessionsByUrl.set(s.serverUrl, s));
initialSessions.forEach((s) => initialSessionsByUrl.set(s.serverUrl, s));

export const serversAtom = atom<Map<string, ServerSession>>(
  new Map(
    Array.from(initialSessionsByUrl.values()).map((s) => [s.serverUrl, s]),
  ),
);

export function setServerSession(session: ServerSession): void {
  const normalizedSession = normalizeServerSession(session);
  const currentServers = defaultStore.get(serversAtom);
  const nextServers = new Map(currentServers);
  nextServers.set(normalizedSession.serverUrl, normalizedSession);

  defaultStore.set(serversAtom, nextServers);
  defaultStore.set(
    activeServerIdAtom,
    serverRouteIdFromServerUrl(normalizedSession.serverUrl),
  );
  persistServers(nextServers);
}

export function removeServerSession(serverUrl: string): void {
  const currentServers = defaultStore.get(serversAtom);
  if (!currentServers.has(serverUrl)) {
    return;
  }

  const nextServers = new Map(currentServers);
  nextServers.delete(serverUrl);

  let removedRouteId: string;
  try {
    removedRouteId = serverRouteIdFromServerUrl(serverUrl);
  } catch {
    removedRouteId = "";
  }
  const curActiveId = defaultStore.get(activeServerIdAtom);
  if (removedRouteId && curActiveId === removedRouteId) {
    defaultStore.set(activeServerIdAtom, null);
  }

  defaultStore.set(serversAtom, nextServers);
  persistServers(nextServers);
}

export function setActiveServer(serverUrl: string | null): void {
  const currentServers = defaultStore.get(serversAtom);
  if (serverUrl === null) {
    defaultStore.set(activeServerIdAtom, null);
    persistServers(currentServers);
    return;
  }

  const exists = currentServers.has(serverUrl);
  if (!exists) {
    defaultStore.set(activeServerIdAtom, null);
    persistServers(currentServers);
    return;
  }

  defaultStore.set(activeServerIdAtom, serverRouteIdFromServerUrl(serverUrl));
  persistServers(currentServers);
}

export function resetServersStore(): void {
  defaultStore.set(serversAtom, new Map());
  defaultStore.set(activeServerIdAtom, null);
  persistServers(new Map());
}
