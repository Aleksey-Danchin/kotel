import axios, {
  type AxiosError,
  type AxiosInstance,
  AxiosHeaders,
} from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/src/api/secure-store";

const serverClients = new Map<string, AxiosInstance>();

type RefreshResponseBody = {
  accessToken: string;
  refreshToken: string;
};

export function getServerClient(serverUrl: string): AxiosInstance {
  const existingClient = serverClients.get(serverUrl);
  if (existingClient) {
    return existingClient;
  }

  const client = axios.create({
    baseURL: serverUrl,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(async (config) => {
    const accessToken = await getAccessToken(serverUrl);
    if (!accessToken) {
      return config;
    }

    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    config.headers = headers;
    return config;
  });

  createAuthRefreshInterceptor(client, async (failedRequest) => {
    const refreshToken = await getRefreshToken(serverUrl);
    if (!refreshToken) {
      await clearTokens(serverUrl);
      throw new Error("No refresh token");
    }

    try {
      const response = await axios.post<RefreshResponseBody>(
        `${serverUrl}/api/session/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        },
      );

      await saveTokens(
        serverUrl,
        response.data.accessToken,
        response.data.refreshToken,
      );

      if (failedRequest.response?.config) {
        const headers = AxiosHeaders.from(
          failedRequest.response.config.headers,
        );
        headers.set("Authorization", `Bearer ${response.data.accessToken}`);
        failedRequest.response.config.headers = headers;
      }
    } catch (error) {
      await clearTokens(serverUrl);
      throw error as AxiosError;
    }
  });

  serverClients.set(serverUrl, client);
  return client;
}

export function resetServerClientsForTests(): void {
  serverClients.clear();
}
