import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  activeServerSessionAtom,
  activeServerUrlAtom,
  serversAtom,
  type MobileServerSession,
} from "./servers";

function makeSession(serverUrl: string): MobileServerSession {
  return {
    serverUrl,
    sessionId: `session-${serverUrl}`,
    user: { id: "user-1", fullname: "Test User", role: "user" },
  };
}

describe("mobile servers atoms", () => {
  it("serversAtom initial state is an empty Map", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    const servers = store.get(serversAtom);
    expect(servers).toBeInstanceOf(Map);
    expect(servers.size).toBe(0);
  });

  it("serversAtom adds a session", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    const serverUrl = "https://server-a.example";
    const session = makeSession(serverUrl);
    store.set(serversAtom, new Map([[serverUrl, session]]));

    expect(store.get(serversAtom).get(serverUrl)).toEqual(session);
  });

  it("serversAtom adds two sessions for different serverUrls", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    const serverUrlA = "https://server-a.example";
    const serverUrlB = "https://server-b.example";
    const sessionA = makeSession(serverUrlA);
    const sessionB = makeSession(serverUrlB);
    store.set(
      serversAtom,
      new Map([
        [serverUrlA, sessionA],
        [serverUrlB, sessionB],
      ]),
    );

    const servers = store.get(serversAtom);
    expect(servers.get(serverUrlA)).toEqual(sessionA);
    expect(servers.get(serverUrlB)).toEqual(sessionB);
    expect(servers.size).toBe(2);
  });

  it("serversAtom removes a session with immutable update pattern", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    const serverUrlA = "https://server-a.example";
    const serverUrlB = "https://server-b.example";
    const sessionA = makeSession(serverUrlA);
    const sessionB = makeSession(serverUrlB);
    const initialServers = new Map([
      [serverUrlA, sessionA],
      [serverUrlB, sessionB],
    ]);
    store.set(serversAtom, initialServers);

    const updatedServers = new Map(store.get(serversAtom));
    updatedServers.delete(serverUrlA);
    store.set(serversAtom, updatedServers);

    const servers = store.get(serversAtom);
    expect(servers.has(serverUrlA)).toBe(false);
    expect(servers.get(serverUrlB)).toEqual(sessionB);
  });

  it("activeServerUrlAtom initial value is null", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    expect(store.get(activeServerUrlAtom)).toBeNull();
  });

  it("activeServerUrlAtom set and read", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    const serverUrl = "https://server.example";
    store.set(activeServerUrlAtom, serverUrl);
    expect(store.get(activeServerUrlAtom)).toBe(serverUrl);
  });

  it("activeServerSessionAtom returns null when activeServerUrlAtom is null", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    expect(store.get(activeServerSessionAtom)).toBeNull();
  });

  it("activeServerSessionAtom returns null when activeServerUrl is missing in serversAtom", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    store.set(activeServerUrlAtom, "https://missing.example");
    expect(store.get(activeServerSessionAtom)).toBeNull();
  });

  it("activeServerSessionAtom returns session when active URL exists in serversAtom", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    const serverUrl = "https://server-a.example";
    const session = makeSession(serverUrl);
    store.set(serversAtom, new Map([[serverUrl, session]]));
    store.set(activeServerUrlAtom, serverUrl);

    expect(store.get(activeServerSessionAtom)).toEqual(session);
  });

  it("activeServerSessionAtom returns null after removing active server from serversAtom", () => {
    const store = createStore();
    store.set(serversAtom, new Map());
    store.set(activeServerUrlAtom, null);

    const serverUrl = "https://server-a.example";
    const session = makeSession(serverUrl);
    store.set(serversAtom, new Map([[serverUrl, session]]));
    store.set(activeServerUrlAtom, serverUrl);

    const updatedServers = new Map(store.get(serversAtom));
    updatedServers.delete(serverUrl);
    store.set(serversAtom, updatedServers);

    expect(store.get(activeServerSessionAtom)).toBeNull();
  });
});
