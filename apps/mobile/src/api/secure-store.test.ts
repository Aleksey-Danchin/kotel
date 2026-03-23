import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStoreMock = vi.hoisted(() => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStoreMock);

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/src/api/secure-store";

describe("secure-store token helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves access and refresh tokens with server-specific keys", async () => {
    await saveTokens("https://kotel.localhost", "access", "refresh");

    expect(secureStoreMock.setItemAsync).toHaveBeenCalledTimes(2);
    expect(secureStoreMock.setItemAsync).toHaveBeenNthCalledWith(
      1,
      "https://kotel.localhost_accessToken",
      "access",
    );
    expect(secureStoreMock.setItemAsync).toHaveBeenNthCalledWith(
      2,
      "https://kotel.localhost_refreshToken",
      "refresh",
    );
  });

  it("reads tokens from secure store using matching keys", async () => {
    secureStoreMock.getItemAsync.mockResolvedValueOnce("access-value");
    secureStoreMock.getItemAsync.mockResolvedValueOnce("refresh-value");

    const accessToken = await getAccessToken("https://kotel.localhost");
    const refreshToken = await getRefreshToken("https://kotel.localhost");

    expect(accessToken).toBe("access-value");
    expect(refreshToken).toBe("refresh-value");
    expect(secureStoreMock.getItemAsync).toHaveBeenNthCalledWith(
      1,
      "https://kotel.localhost_accessToken",
    );
    expect(secureStoreMock.getItemAsync).toHaveBeenNthCalledWith(
      2,
      "https://kotel.localhost_refreshToken",
    );
  });

  it("clears both tokens for a server", async () => {
    await clearTokens("https://kotel.localhost");

    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(secureStoreMock.deleteItemAsync).toHaveBeenNthCalledWith(
      1,
      "https://kotel.localhost_accessToken",
    );
    expect(secureStoreMock.deleteItemAsync).toHaveBeenNthCalledWith(
      2,
      "https://kotel.localhost_refreshToken",
    );
  });
});
