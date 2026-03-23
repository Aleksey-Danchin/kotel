import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeServerUrlAtom,
  getPersistedServerUrls,
  removeServerSession,
  resetServersStore,
  serversAtom,
  serversStore,
  setActiveServer,
  setServerSession,
} from "./servers";

function createLocalStorageMock() {
  const data = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
    removeItem(key: string): void {
      data.delete(key);
    },
    clear(): void {
      data.clear();
    },
  };
}

describe("servers store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds and removes server sessions immutably", () => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    resetServersStore();

    const serverA = "https://kotel.localhost";
    const serverB = "https://other.localhost";

    setServerSession({
      serverUrl: serverA,
      sessionId: "session-1",
      user: { id: "1", fullname: "User A", login: "user-a", role: "admin" },
    });
    setServerSession({
      serverUrl: serverB,
      sessionId: "session-2",
      user: { id: "2", fullname: "User B", login: "user-b", role: "user" },
    });

    const afterInsert = serversStore.get(serversAtom);
    expect(afterInsert.size).toBe(2);
    expect(afterInsert.get(serverA)?.sessionId).toBe("session-1");

    removeServerSession(serverA);
    const afterRemove = serversStore.get(serversAtom);
    expect(afterRemove.size).toBe(1);
    expect(afterRemove.has(serverA)).toBe(false);
    expect(afterRemove.has(serverB)).toBe(true);
  });

  it("keeps active server consistent", () => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    resetServersStore();
    const serverA = "https://kotel.localhost";
    const serverB = "https://second.localhost";

    setServerSession({
      serverUrl: serverA,
      sessionId: "session-1",
      user: { id: "1", fullname: "User A", login: "user-a", role: "admin" },
    });
    setServerSession({
      serverUrl: serverB,
      sessionId: "session-2",
      user: { id: "2", fullname: "User B", login: "user-b", role: "user" },
    });

    expect(serversStore.get(activeServerUrlAtom)).toBe(serverA);

    setActiveServer(serverB);
    expect(serversStore.get(activeServerUrlAtom)).toBe(serverB);

    removeServerSession(serverB);
    expect(serversStore.get(activeServerUrlAtom)).toBe(serverA);
  });

  it("persists server urls for reload rehydration", () => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    resetServersStore();

    setServerSession({
      serverUrl: "https://kotel.localhost",
      sessionId: "session-1",
      user: { id: "1", fullname: "User A", login: "user-a", role: "admin" },
    });
    setServerSession({
      serverUrl: "https://katel.localhost",
      sessionId: "session-2",
      user: { id: "2", fullname: "User B", login: "user-b", role: "user" },
    });

    expect(getPersistedServerUrls()).toEqual([
      "https://kotel.localhost",
      "https://katel.localhost",
    ]);

    removeServerSession("https://kotel.localhost");
    expect(getPersistedServerUrls()).toEqual(["https://katel.localhost"]);
  });
});
