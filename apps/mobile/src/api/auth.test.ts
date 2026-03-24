import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cryptoMock = vi.hoisted(() => ({
  getRandomBytes: vi.fn(
    () => new Uint8Array(Array.from({ length: 32 }, () => 1)),
  ),
  digestStringAsync: vi.fn(async () => "challenge+/=="),
  randomUUID: vi.fn(() => "state-123"),
  CryptoDigestAlgorithm: {
    SHA256: "SHA-256",
  },
  CryptoEncoding: {
    BASE64: "BASE64",
  },
}));

const webBrowserMock = vi.hoisted(() => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}));

const linkingMock = vi.hoisted(() => ({
  createURL: vi.fn(() => "exp://127.0.0.1:8081/--/auth/callback"),
}));

const secureStoreApiMock = vi.hoisted(() => ({
  saveTokens: vi.fn(),
}));

vi.mock("expo-crypto", () => cryptoMock);
vi.mock("expo-web-browser", () => webBrowserMock);
vi.mock("expo-linking", () => linkingMock);
vi.mock("@/src/api/secure-store", () => secureStoreApiMock);

import { addMobileServer } from "@/src/api/auth";

describe("addMobileServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("completes oauth flow, stores tokens and fetches session status", async () => {
    webBrowserMock.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://127.0.0.1:8081/--/auth/callback?code=auth-code&state=state-123",
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          sessionId: "session-1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionId: "session-1",
          user: {
            id: "user-1",
            fullname: "Test User",
            role: "USER",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await addMobileServer("https://kotel.localhost/");

    expect(webBrowserMock.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining("https://kotel.localhost/api/auth/login"),
      "exp://127.0.0.1:8081/--/auth/callback",
    );
    expect(webBrowserMock.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining("code_challenge_method=S256"),
      "exp://127.0.0.1:8081/--/auth/callback",
    );
    expect(webBrowserMock.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining("state=state-123"),
      "exp://127.0.0.1:8081/--/auth/callback",
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://kotel.localhost/api/auth/token",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://kotel.localhost/api/session/status",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      }),
    );
    expect(secureStoreApiMock.saveTokens).toHaveBeenCalledWith(
      "https://kotel.localhost",
      "access-token",
      "refresh-token",
    );
    expect(result).toEqual({
      sessionId: "session-1",
      user: {
        id: "user-1",
        fullname: "Test User",
        role: "USER",
      },
    });
  });

  it("throws on state mismatch", async () => {
    webBrowserMock.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://127.0.0.1:8081/--/auth/callback?code=auth-code&state=wrong-state",
    });
    vi.stubGlobal("fetch", vi.fn());

    await expect(addMobileServer("https://kotel.localhost")).rejects.toThrow(
      "OAuth state mismatch",
    );
  });

  it("downgrades https IP server url to http for Expo Go", async () => {
    webBrowserMock.openAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://127.0.0.1:8081/--/auth/callback?code=auth-code&state=state-123",
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          sessionId: "session-1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessionId: "session-1",
          user: {
            id: "user-1",
            fullname: "Test User",
            role: "USER",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await addMobileServer("https://192.168.31.186:3001");

    expect(webBrowserMock.openAuthSessionAsync).toHaveBeenCalledWith(
      expect.stringContaining("https://192.168.31.186:3001/api/auth/login"),
      "exp://127.0.0.1:8081/--/auth/callback",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://192.168.31.186:3001/api/auth/token",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://192.168.31.186:3001/api/session/status",
      expect.any(Object),
    );
  });
});
