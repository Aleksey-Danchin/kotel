import axios, { type AxiosInstance } from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";

const clients = new Map<string, AxiosInstance>();

export function getServerClient(serverUrl: string): AxiosInstance {
  const cachedClient = clients.get(serverUrl);
  if (cachedClient) {
    return cachedClient;
  }

  const instance = axios.create({
    baseURL: serverUrl,
    withCredentials: true,
  });

  createAuthRefreshInterceptor(instance, async () => {
    await instance.post("/api/session/refresh", {});
  });

  clients.set(serverUrl, instance);
  return instance;
}

export function removeServerClient(serverUrl: string): void {
  clients.delete(serverUrl);
}
