import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "kotel.designer.servers";

describe("servers state persistence", () => {
  beforeEach(() => {
    let storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage = new Map<string, string>();
      },
    };
    vi.stubGlobal("localStorage", localStorageMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("persists server name when session is saved", async () => {
    const { setServerSession, serversAtom } = await import("./servers");
    const { defaultStore } = await import("../global/defaultStore");

    setServerSession({
      serverUrl: "https://name.example:3000",
      name: "Production EU",
      user: {
        id: "u-1",
        fullname: "Root User",
        login: "root",
        role: "root",
      },
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const savedSession = saved.find(
      (session: { serverUrl: string; name?: string }) =>
        session.serverUrl === "https://name.example:3000",
    );
    expect(savedSession).toBeDefined();
    expect(savedSession?.name).toBe("Production EU");

    const storedSession = defaultStore.get(serversAtom).get("https://name.example:3000");
    expect(storedSession?.name).toBe("Production EU");
  });

  it("normalizes legacy entries without valid name", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          serverUrl: "https://legacy.example:3000",
          name: "   ",
          user: {
            id: "u-2",
            fullname: "Admin User",
            login: "admin",
            role: "admin",
          },
        },
      ]),
    );

    const { serversAtom } = await import("./servers");
    const { defaultStore } = await import("../global/defaultStore");
    const restored = defaultStore.get(serversAtom).get("https://legacy.example:3000");

    expect(restored?.name).toBeUndefined();
  });
});
