import { describe, expect, it } from "vitest";
import {
  activeServerUrlAtom,
  removeServerSession,
  resetServersStore,
  serversAtom,
  serversStore,
  setActiveServer,
  setServerSession,
} from "./servers";

describe("servers store", () => {
  it("adds and removes server sessions immutably", () => {
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
});
