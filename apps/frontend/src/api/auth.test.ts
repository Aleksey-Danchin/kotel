import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAuthForTests,
  addServer,
  removeServer,
} from "./auth";
import {
  resetServersStore,
  serversAtom,
  serversStore,
} from "../state/servers";

interface ListenerRegistry {
  message?: (event: MessageEvent<{ code?: string; state?: string }>) => void;
}

function createStorageMock() {
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
  };
}

describe("oauth auth api", () => {
  const listeners: ListenerRegistry = {};
  let openMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let randomUUIDMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners.message = undefined;
    resetServersStore();

    const storage = createStorageMock();
    vi.stubGlobal("sessionStorage", storage);
    __resetAuthForTests();

    const popup = { closed: false } as Window;
    openMock = vi.fn(() => popup);
    fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/auth/token")) {
        return {
          ok: true,
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        json: async () => ({
          sessionId: "sess-1",
          user: {
            id: "u-1",
            fullname: "OAuth User",
            login: "oauth-user",
            role: "admin",
          },
        }),
      };
    });
    randomUUIDMock = vi.fn(() => "state-1");

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", {
      randomUUID: randomUUIDMock,
      getRandomValues: (array: Uint8Array) => {
        array.fill(1);
        return array;
      },
      subtle: {
        digest: vi.fn(async () => new Uint8Array([1, 2, 3, 4]).buffer),
      },
    });

    const windowMock = {
      location: { origin: "http://localhost:5173" },
      opener: null,
      open: openMock,
      setInterval,
      clearInterval,
      addEventListener: (
        type: string,
        callback: ListenerRegistry["message"],
      ) => {
        if (type === "message") {
          listeners.message = callback;
        }
      },
    };
    vi.stubGlobal("window", windowMock as unknown as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens popup and stores a new server after callback", async () => {
    const pending = addServer("https://kotel.localhost");
    await vi.waitFor(() => {
      expect(openMock).toHaveBeenCalledTimes(1);
    });

    expect(openMock.mock.calls[0]?.[0]).toContain(
      "https://kotel.localhost/api/auth/login",
    );

    listeners.message?.({
      origin: "http://localhost:5173",
      data: { code: "auth-code", state: "state-1" },
    } as MessageEvent<{ code: string; state: string }>);

    const session = await pending;
    expect(session.serverUrl).toBe("https://kotel.localhost");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const servers = serversStore.get(serversAtom);
    expect(servers.get("https://kotel.localhost")?.user.login).toBe(
      "oauth-user",
    );
  });

  it("rejects when callback state does not match stored state", async () => {
    const pending = addServer("https://kotel.localhost");
    await vi.waitFor(() => {
      expect(openMock).toHaveBeenCalledTimes(1);
    });
    sessionStorage.setItem("oauth_state_https://kotel.localhost", "tampered");
    listeners.message?.({
      origin: "http://localhost:5173",
      data: { code: "auth-code", state: "state-1" },
    } as MessageEvent<{ code: string; state: string }>);

    await expect(pending).rejects.toThrow("OAuth state mismatch");
  });

  it("supports independent flows for multiple servers", async () => {
    randomUUIDMock.mockReturnValueOnce("state-a").mockReturnValueOnce("state-b");
    const first = addServer("https://kotel.localhost");
    const second = addServer("https://other.localhost");
    await vi.waitFor(() => {
      expect(openMock).toHaveBeenCalledTimes(2);
    });

    listeners.message?.({
      origin: "http://localhost:5173",
      data: { code: "code-b", state: "state-b" },
    } as MessageEvent<{ code: string; state: string }>);
    listeners.message?.({
      origin: "http://localhost:5173",
      data: { code: "code-a", state: "state-a" },
    } as MessageEvent<{ code: string; state: string }>);

    await Promise.all([first, second]);

    const servers = serversStore.get(serversAtom);
    expect(servers.has("https://kotel.localhost")).toBe(true);
    expect(servers.has("https://other.localhost")).toBe(true);
  });

  it("cleans local storage keys when removing server", async () => {
    const pending = addServer("https://kotel.localhost");
    await vi.waitFor(() => {
      expect(openMock).toHaveBeenCalledTimes(1);
    });
    listeners.message?.({
      origin: "http://localhost:5173",
      data: { code: "auth-code", state: "state-1" },
    } as MessageEvent<{ code: string; state: string }>);
    await pending;

    sessionStorage.setItem("oauth_state_https://kotel.localhost", "state-1");
    sessionStorage.setItem("oauth_verifier_https://kotel.localhost", "v-1");
    removeServer("https://kotel.localhost");

    expect(
      sessionStorage.getItem("oauth_state_https://kotel.localhost"),
    ).toBeNull();
    expect(
      sessionStorage.getItem("oauth_verifier_https://kotel.localhost"),
    ).toBeNull();
  });
});
