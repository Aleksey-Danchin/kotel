import axios, { type AxiosInstance } from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";

const clients = new Map<string, AxiosInstance>();
const refreshWaiters = new Map<
  string,
  Array<{ resolve: () => void; reject: (error: Error) => void }>
>();

type RefreshResponseType = "refreshed" | "refresh_failed";
type RefreshWorkerResponse = {
  type: RefreshResponseType;
  serverUrl: string;
};

let refreshWorker: SharedWorker | null = null;
let workerListenerAttached = false;

function resolveRefreshWaiters(
  serverUrl: string,
  type: RefreshResponseType,
): void {
  const waiters = refreshWaiters.get(serverUrl);
  if (!waiters) {
    return;
  }

  refreshWaiters.delete(serverUrl);

  if (type === "refreshed") {
    waiters.forEach(({ resolve }) => resolve());
    return;
  }

  const error = new Error("Refresh failed");
  waiters.forEach(({ reject }) => reject(error));
}

function getSharedRefreshWorker(): SharedWorker {
  if (!refreshWorker) {
    refreshWorker = new SharedWorker(
      new URL("../workers/shared-refresh-worker.ts", import.meta.url),
      { type: "module", name: "refresh-coordinator" },
    );
    refreshWorker.port.start();
  }

  if (!workerListenerAttached) {
    refreshWorker.port.addEventListener("message", (event: MessageEvent) => {
      const data = event.data as RefreshWorkerResponse;
      if (!data || typeof data.serverUrl !== "string") {
        return;
      }
      if (data.type !== "refreshed" && data.type !== "refresh_failed") {
        return;
      }

      resolveRefreshWaiters(data.serverUrl, data.type);
    });
    workerListenerAttached = true;
  }

  return refreshWorker;
}

function createRefreshLogic(serverUrl: string): () => Promise<void> {
  if (typeof SharedWorker === "undefined") {
    return async () => {
      const response = await fetch(`${serverUrl}/api/session/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Refresh failed");
      }
    };
  }

  return () =>
    new Promise<void>((resolve, reject) => {
      const waiters = refreshWaiters.get(serverUrl) ?? [];
      waiters.push({ resolve, reject });
      refreshWaiters.set(serverUrl, waiters);

      const worker = getSharedRefreshWorker();
      worker.port.postMessage({ type: "refresh", serverUrl });
    });
}

export function getServerClient(serverUrl: string): AxiosInstance {
  const cachedClient = clients.get(serverUrl);
  if (cachedClient) {
    return cachedClient;
  }

  const instance = axios.create({
    baseURL: serverUrl,
    withCredentials: true,
  });

  createAuthRefreshInterceptor(instance, createRefreshLogic(serverUrl));

  clients.set(serverUrl, instance);
  return instance;
}

export function removeServerClient(serverUrl: string): void {
  clients.delete(serverUrl);
}
