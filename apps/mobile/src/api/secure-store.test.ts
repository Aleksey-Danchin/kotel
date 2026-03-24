import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/src/api/secure-store";

const secureStoreMock = vi.hoisted(() => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStoreMock);

describe("secure-store token helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves access and refresh tokens with server-specific keys", async () => {
    await saveTokens("https://kotel.localhost", "access", "refresh");

    expect(secureStoreMock.setItemAsync).toHaveBeenCalledTimes(2);
    const firstKey = secureStoreMock.setItemAsync.mock.calls[0]?.[0];
    const secondKey = secureStoreMock.setItemAsync.mock.calls[1]?.[0];
    expect(secureStoreMock.setItemAsync).toHaveBeenNthCalledWith(
      1,
      firstKey,
      "access",
    );
    expect(secureStoreMock.setItemAsync).toHaveBeenNthCalledWith(
      2,
      secondKey,
      "refresh",
    );
    expect(firstKey).toMatch(/^server_[0-9a-f]+_accessToken$/);
    expect(secondKey).toMatch(/^server_[0-9a-f]+_refreshToken$/);
  });

  it("reads tokens from secure store using matching keys", async () => {
    secureStoreMock.getItemAsync.mockResolvedValueOnce("access-value");
    secureStoreMock.getItemAsync.mockResolvedValueOnce("refresh-value");

    const accessToken = await getAccessToken("https://kotel.localhost");
    const refreshToken = await getRefreshToken("https://kotel.localhost");

    expect(accessToken).toBe("access-value");
    expect(refreshToken).toBe("refresh-value");
    const firstKey = secureStoreMock.getItemAsync.mock.calls[0]?.[0];
    const secondKey = secureStoreMock.getItemAsync.mock.calls[1]?.[0];
    expect(secureStoreMock.getItemAsync).toHaveBeenNthCalledWith(
      1,
      firstKey,
    );
    expect(secureStoreMock.getItemAsync).toHaveBeenNthCalledWith(
      2,
      secondKey,
    );
    expect(firstKey).toMatch(/^server_[0-9a-f]+_accessToken$/);
    expect(secondKey).toMatch(/^server_[0-9a-f]+_refreshToken$/);
  });

  it("clears both tokens for a server", async () => {
    await clearTokens("https://kotel.localhost");

    expect(secureStoreMock.deleteItemAsync).toHaveBeenCalledTimes(2);
    const firstKey = secureStoreMock.deleteItemAsync.mock.calls[0]?.[0];
    const secondKey = secureStoreMock.deleteItemAsync.mock.calls[1]?.[0];
    expect(secureStoreMock.deleteItemAsync).toHaveBeenNthCalledWith(
      1,
      firstKey,
    );
    expect(secureStoreMock.deleteItemAsync).toHaveBeenNthCalledWith(
      2,
      secondKey,
    );
    expect(firstKey).toMatch(/^server_[0-9a-f]+_accessToken$/);
    expect(secondKey).toMatch(/^server_[0-9a-f]+_refreshToken$/);
  });
});
