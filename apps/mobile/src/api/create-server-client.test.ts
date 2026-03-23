import axios, { AxiosHeaders } from "axios";
import type { AxiosInstance } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getServerClient, resetServerClientsForTests } from "@/src/api/create-server-client";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/src/api/secure-store";

const { authRefreshMock } = vi.hoisted(() => ({
  authRefreshMock: vi.fn(),
}));

vi.mock("axios-auth-refresh", () => ({
  default: authRefreshMock,
}));

vi.mock("@/src/api/secure-store", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  saveTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

describe("create-server-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServerClientsForTests();
  });

  it("returns cached axios instance for same server url", () => {
    const first = getServerClient("https://one.example");
    const second = getServerClient("https://one.example");
    const third = getServerClient("https://two.example");

    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });

  it("adds access token as Bearer header", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("token-1");

    const client = getServerClient("https://api.example");
    const requestHandler = getRequestHandler(client);
    const resultConfig = await requestHandler({
      headers: {},
    } as any);

    const headers = AxiosHeaders.from(resultConfig.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("refreshes on 401 and persists new tokens", async () => {
    vi.mocked(getRefreshToken).mockResolvedValue("refresh-1");
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { accessToken: "new-access", refreshToken: "new-refresh" },
    });

    const client = getServerClient("https://api.example");
    const refreshLogic = getRefreshLogic();
    const failedRequest = {
      response: {
        config: {
          headers: {},
        },
      },
    } as AxiosErrorRequest;

    await refreshLogic(failedRequest);

    expect(axios.post).toHaveBeenCalledWith(
      "https://api.example/api/session/refresh",
      {},
      {
        headers: {
          Authorization: "Bearer refresh-1",
        },
      },
    );
    expect(saveTokens).toHaveBeenCalledWith(
      "https://api.example",
      "new-access",
      "new-refresh",
    );
    const headers = AxiosHeaders.from(failedRequest.response.config.headers);
    expect(headers.get("Authorization")).toBe("Bearer new-access");
    expect(clearTokens).not.toHaveBeenCalled();
    expect(client).toBeDefined();
  });
});

function getRequestHandler(client: AxiosInstance) {
  const handlers = (client.interceptors.request as any).handlers ?? [];
  const interceptor = handlers.find(
    (handler: any) => typeof handler?.fulfilled === "function",
  );
  if (!interceptor?.fulfilled) {
    throw new Error("Request interceptor not found");
  }

  return interceptor.fulfilled;
}

function getRefreshLogic() {
  const refreshLogic = authRefreshMock.mock.calls[0]?.[1] as
    | ((failedRequest: AxiosErrorRequest) => Promise<void>)
    | undefined;
  if (!refreshLogic) {
    throw new Error("Refresh logic not registered");
  }

  return refreshLogic;
}

type AxiosErrorRequest = {
  response: {
    config: {
      headers: any;
    };
  };
};
