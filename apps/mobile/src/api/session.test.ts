import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  forceMobileSessionRefresh,
  getMobileSessionStatus,
  logoutMobileSession,
} from "@/src/api/session";

const { getServerClientMock, clientMock } = vi.hoisted(() => ({
  getServerClientMock: vi.fn(),
  clientMock: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/src/api/create-server-client", () => ({
  getServerClient: getServerClientMock,
}));

describe("mobile session api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerClientMock.mockReturnValue(clientMock);
  });

  it("reads session status via per-server client", async () => {
    clientMock.get.mockResolvedValue({
      data: {
        sessionId: "session-1",
        user: {
          id: "user-1",
          fullname: "Test User",
          login: "tester",
          role: "USER",
        },
      },
    });

    const result = await getMobileSessionStatus("https://kotel.localhost");

    expect(getServerClientMock).toHaveBeenCalledWith("https://kotel.localhost");
    expect(clientMock.get).toHaveBeenCalledWith("/api/session/status");
    expect(result).toEqual({
      sessionId: "session-1",
      user: {
        id: "user-1",
        fullname: "Test User",
        login: "tester",
        role: "USER",
      },
    });
  });

  it("forces refresh through per-server client", async () => {
    clientMock.post.mockResolvedValue({});

    await forceMobileSessionRefresh("https://kotel.localhost");

    expect(getServerClientMock).toHaveBeenCalledWith("https://kotel.localhost");
    expect(clientMock.post).toHaveBeenCalledWith("/api/session/refresh");
  });

  it("logs out optionally on all devices", async () => {
    clientMock.post.mockResolvedValue({});

    await logoutMobileSession("https://kotel.localhost", true);

    expect(getServerClientMock).toHaveBeenCalledWith("https://kotel.localhost");
    expect(clientMock.post).toHaveBeenCalledWith("/api/session/logout", {
      allDevices: true,
    });
  });
});
