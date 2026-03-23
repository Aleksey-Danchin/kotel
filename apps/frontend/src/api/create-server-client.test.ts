import type { AxiosInstance } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createAuthRefreshInterceptor from "axios-auth-refresh";
import { getServerClient, removeServerClient } from "./create-server-client";

vi.mock("axios-auth-refresh", () => ({
  default: vi.fn(),
}));

describe("create server client", () => {
  let originalSharedWorker: typeof SharedWorker | undefined;
  let fetchMock: ReturnType<typeof vi.fn>;

  const workerPortListeners = new Set<(event: MessageEvent) => void>();
  const workerPort = {
    start: vi.fn(),
    postMessage: vi.fn((message: { type: string; serverUrl: string }) => {
      setTimeout(() => {
        workerPortListeners.forEach((listener) => {
          listener({
            data: { type: "refreshed", serverUrl: message.serverUrl },
          } as MessageEvent);
        });
      }, 0);
    }),
    addEventListener: vi.fn(
      (type: string, listener: (event: MessageEvent) => void) => {
        if (type === "message") {
          workerPortListeners.add(listener);
        }
      },
    ),
    removeEventListener: vi.fn(
      (type: string, listener: (event: MessageEvent) => void) => {
        if (type === "message") {
          workerPortListeners.delete(listener);
        }
      },
    ),
  };

  class MockSharedWorker {
    public port = workerPort;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    originalSharedWorker = globalThis.SharedWorker;
    (globalThis as { SharedWorker?: typeof SharedWorker }).SharedWorker =
      MockSharedWorker as unknown as typeof SharedWorker;

    fetchMock = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    removeServerClient("https://kotel.localhost");
    removeServerClient("https://other.localhost");

    if (originalSharedWorker) {
      (globalThis as { SharedWorker?: typeof SharedWorker }).SharedWorker =
        originalSharedWorker;
    } else {
      delete (globalThis as { SharedWorker?: typeof SharedWorker })
        .SharedWorker;
    }
    vi.unstubAllGlobals();
  });

  it("creates and caches an axios client per server", () => {
    const serverUrl = "https://kotel.localhost";
    const firstClient = getServerClient(serverUrl);
    const secondClient = getServerClient(serverUrl);

    expect(firstClient).toBe(secondClient);
    expect(firstClient.defaults.baseURL).toBe(serverUrl);
    expect(firstClient.defaults.withCredentials).toBe(true);
  });

  it("creates independent instances for different servers", () => {
    const firstClient = getServerClient("https://kotel.localhost");
    const secondClient = getServerClient("https://other.localhost");

    expect(firstClient).not.toBe(secondClient);
    expect(firstClient.defaults.baseURL).toBe("https://kotel.localhost");
    expect(secondClient.defaults.baseURL).toBe("https://other.localhost");
  });

  it("removes cached client instance", () => {
    const serverUrl = "https://kotel.localhost";
    const firstClient = getServerClient(serverUrl);
    removeServerClient(serverUrl);
    const secondClient = getServerClient(serverUrl);

    expect(firstClient).not.toBe(secondClient);
  });

  it("registers auth refresh logic that calls refresh endpoint", async () => {
    const serverUrl = "https://kotel.localhost";
    const client = getServerClient(serverUrl);

    const refreshSetup = vi.mocked(createAuthRefreshInterceptor).mock.calls[0];
    expect(refreshSetup?.[0]).toBe(client);
    expect(typeof refreshSetup?.[1]).toBe("function");

    const postSpy = vi
      .spyOn(client as AxiosInstance, "post")
      .mockResolvedValue({} as never);

    const refreshLogic = refreshSetup?.[1];
    if (!refreshLogic) {
      throw new Error("Refresh logic interceptor was not registered");
    }

    postSpy.mockClear();
    await refreshLogic({
      response: {
        config: {},
      },
    } as never);

    expect(workerPort.postMessage).toHaveBeenCalledWith({
      type: "refresh",
      serverUrl,
    });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("uses direct fetch fallback without SharedWorker support", async () => {
    delete (globalThis as { SharedWorker?: typeof SharedWorker }).SharedWorker;

    const serverUrl = "https://kotel.localhost";
    getServerClient(serverUrl);

    const refreshSetup = vi.mocked(createAuthRefreshInterceptor).mock.calls[0];
    const refreshLogic = refreshSetup?.[1];
    if (!refreshLogic) {
      throw new Error("Refresh logic interceptor was not registered");
    }

    await refreshLogic({
      response: {
        config: {},
      },
    } as never);

    expect(fetchMock).toHaveBeenCalledWith(
      `${serverUrl}/api/session/refresh`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });

  it("handles refresh independently for different servers", async () => {
    const firstServer = "https://kotel.localhost";
    const secondServer = "https://other.localhost";
    getServerClient(firstServer);
    getServerClient(secondServer);

    const refreshSetups = vi.mocked(createAuthRefreshInterceptor).mock.calls;
    const firstRefreshLogic = refreshSetups[0]?.[1];
    const secondRefreshLogic = refreshSetups[1]?.[1];
    if (!firstRefreshLogic || !secondRefreshLogic) {
      throw new Error("Refresh logic interceptor was not registered");
    }

    await Promise.all([
      firstRefreshLogic({ response: { config: {} } } as never),
      secondRefreshLogic({ response: { config: {} } } as never),
    ]);

    expect(workerPort.postMessage).toHaveBeenCalledWith({
      type: "refresh",
      serverUrl: firstServer,
    });
    expect(workerPort.postMessage).toHaveBeenCalledWith({
      type: "refresh",
      serverUrl: secondServer,
    });
  });
});
