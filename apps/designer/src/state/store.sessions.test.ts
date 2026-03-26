import { beforeEach, describe, expect, it, vi } from "vitest";

type StoreModule = typeof import("./store");

async function loadStoreModule(): Promise<StoreModule> {
  vi.resetModules();
  return import("./store");
}

describe("session mutations in store", () => {
  let storeModule: StoreModule;

  beforeEach(async () => {
    storeModule = await loadStoreModule();
  });

  it("detects current session by server id", () => {
    const sessions = storeModule.getAllSessions();
    expect(storeModule.isCurrentSession(sessions[0], sessions[0].serverId)).toBe(true);
    expect(storeModule.isCurrentSession(sessions[0], sessions[1].serverId)).toBe(false);
  });

  it("removes current session by selected server id", () => {
    storeModule.removeCurrentSession("srv_local");
    const sessions = storeModule.getAllSessions();
    expect(sessions.some((session) => session.serverId === "srv_local")).toBe(false);
  });

  it("removes all sessions except current", () => {
    storeModule.removeAllSessionsExcept("srv_main");
    const sessions = storeModule.getAllSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.serverId).toBe("srv_main");
  });

  it("removes one session by id", () => {
    const sessions = storeModule.getAllSessions();
    const targetSession = sessions[0];
    storeModule.removeSessionById(targetSession.id);
    const next = storeModule.getAllSessions();
    expect(next.find((session) => session.id === targetSession.id)).toBeUndefined();
    expect(next).toHaveLength(sessions.length - 1);
  });

  it("removes all sessions", () => {
    storeModule.removeAllSessions();
    expect(storeModule.getAllSessions()).toHaveLength(0);
  });
});
