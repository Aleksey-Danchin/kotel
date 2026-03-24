import * as SecureStore from "expo-secure-store";

const SECURE_STORE_KEY_RE = /^[A-Za-z0-9._-]+$/;

function getServerKeyId(serverUrl: string): string {
  const input = serverUrl.trim();
  if (!input) {
    return "server_0";
  }

  // Stable short key for SecureStore; avoids invalid characters and key bloat.
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }

  return `server_${hash.toString(16)}`;
}

function getAccessTokenKey(serverUrl: string): string {
  return `${getServerKeyId(serverUrl)}_accessToken`;
}

function getRefreshTokenKey(serverUrl: string): string {
  return `${getServerKeyId(serverUrl)}_refreshToken`;
}

function assertValidSecureStoreKey(
  key: string,
  serverUrl: string,
  operation: string,
): void {
  if (!key || !SECURE_STORE_KEY_RE.test(key)) {
    const message = `[SecureStore:${operation}] invalid key generated: "${key}" for serverUrl="${serverUrl}"`;
    throw new Error(message);
  }
}

export async function saveTokens(
  serverUrl: string,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const accessKey = getAccessTokenKey(serverUrl);
  const refreshKey = getRefreshTokenKey(serverUrl);
  assertValidSecureStoreKey(accessKey, serverUrl, "set-access");
  assertValidSecureStoreKey(refreshKey, serverUrl, "set-refresh");

  try {
    await SecureStore.setItemAsync(accessKey, accessToken);
    await SecureStore.setItemAsync(refreshKey, refreshToken);
  } catch (error) {
    throw error;
  }
}

export async function getAccessToken(
  serverUrl: string,
): Promise<string | null> {
  const accessKey = getAccessTokenKey(serverUrl);
  assertValidSecureStoreKey(accessKey, serverUrl, "get-access");
  try {
    return await SecureStore.getItemAsync(accessKey);
  } catch (error) {
    throw error;
  }
}

export async function getRefreshToken(
  serverUrl: string,
): Promise<string | null> {
  const refreshKey = getRefreshTokenKey(serverUrl);
  assertValidSecureStoreKey(refreshKey, serverUrl, "get-refresh");
  try {
    return await SecureStore.getItemAsync(refreshKey);
  } catch (error) {
    throw error;
  }
}

export async function clearTokens(serverUrl: string): Promise<void> {
  const accessKey = getAccessTokenKey(serverUrl);
  const refreshKey = getRefreshTokenKey(serverUrl);
  assertValidSecureStoreKey(accessKey, serverUrl, "delete-access");
  assertValidSecureStoreKey(refreshKey, serverUrl, "delete-refresh");
  try {
    await SecureStore.deleteItemAsync(accessKey);
    await SecureStore.deleteItemAsync(refreshKey);
  } catch (error) {
    throw error;
  }
}
