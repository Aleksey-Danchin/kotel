import type { AxiosInstance } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createAuthRefreshInterceptor from "axios-auth-refresh";
import { getServerClient, removeServerClient } from "./create-server-client";

vi.mock("axios-auth-refresh", () => ({
  default: vi.fn(),
}));

describe("create server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    removeServerClient("https://kotel.localhost");
    removeServerClient("https://other.localhost");
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
    await refreshLogic({
      response: {
        config: {},
      },
    } as never);

    expect(postSpy).toHaveBeenCalledWith("/api/session/refresh", {});
  });
});
