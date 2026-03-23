import * as SecureStore from "expo-secure-store";

function getAccessTokenKey(serverUrl: string): string {
  return `${serverUrl}_accessToken`;
}

function getRefreshTokenKey(serverUrl: string): string {
  return `${serverUrl}_refreshToken`;
}

export async function saveTokens(
  serverUrl: string,
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await SecureStore.setItemAsync(getAccessTokenKey(serverUrl), accessToken);
  await SecureStore.setItemAsync(getRefreshTokenKey(serverUrl), refreshToken);
}

export async function getAccessToken(
  serverUrl: string,
): Promise<string | null> {
  return SecureStore.getItemAsync(getAccessTokenKey(serverUrl));
}

export async function getRefreshToken(
  serverUrl: string,
): Promise<string | null> {
  return SecureStore.getItemAsync(getRefreshTokenKey(serverUrl));
}

export async function clearTokens(serverUrl: string): Promise<void> {
  await SecureStore.deleteItemAsync(getAccessTokenKey(serverUrl));
  await SecureStore.deleteItemAsync(getRefreshTokenKey(serverUrl));
}
