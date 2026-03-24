import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetLogoutQueueForTests,
  flushLogoutQueue,
  getLogoutQueueSize,
  logout,
} from "./logout";
import { removeServerSession, resetServersStore, setServerSession } from "../state/servers";
import { getServerClient, removeServerClient } from "./create-server-client";

vi.mock("./create-server-client", () => ({
  getServerClient: vi.fn(),
  removeServerClient: vi.fn(),
}));

vi.mock("../state/servers", async () => {
  const actual = await vi.importActual<typeof import("../state/servers")>(
    "../state/servers",
  );
  return {
    ...actual,
    removeServerSession: vi.fn(actual.removeServerSession),
  };
});

describe("logout api", () => {
  let postMock: ReturnType<typeof vi.fn>;
  let addEventListenerMock: ReturnType<typeof vi.fn>;
  let alertMock: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    __resetLogoutQueueForTests();
    resetServersStore();
    setServerSession({
      serverUrl: "https://kotel.localhost",
      sessionId: "sess-1",
      user: {
        id: "u-1",
        fullname: "User",
        login: "user",
        role: "root",
      },
    });

    postMock = vi.fn(async () => undefined);
    vi.mocked(getServerClient).mockReturnValue({
      post: postMock,
    } as unknown as ReturnType<typeof getServerClient>);

    addEventListenerMock = vi.fn();
    alertMock = vi.fn();
    fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      addEventListener: addEventListenerMock,
      alert: alertMock,
    } as unknown as Window);
  });

  it("queues logout request when API call fails", async () => {
    postMock.mockRejectedValueOnce(new Error("network"));

    await logout("https://kotel.localhost", false);

    expect(getLogoutQueueSize()).toBe(1);
    expect(removeServerSession).toHaveBeenCalledWith("https://kotel.localhost");
    expect(removeServerClient).toHaveBeenCalledWith("https://kotel.localhost");
  });

  it("retries queued logouts when queue is flushed", async () => {
    postMock.mockRejectedValueOnce(new Error("offline"));
    await logout("https://kotel.localhost", false);

    await flushLogoutQueue();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://kotel.localhost/api/session/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(getLogoutQueueSize()).toBe(0);
  });

  it("shows warning when all-devices logout fails", async () => {
    postMock.mockRejectedValueOnce(new Error("offline"));

    await logout("https://kotel.localhost", true);

    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(getLogoutQueueSize()).toBe(1);
  });
});
