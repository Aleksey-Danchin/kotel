import { removeServerSession } from "../state/servers";
import { getServerClient, removeServerClient } from "./create-server-client";

interface LogoutQueueItem {
  serverUrl: string;
  allDevices: boolean;
}

const logoutQueue: LogoutQueueItem[] = [];
let onlineListenerInitialized = false;

function notifyAllDevicesLogoutFailure(serverUrl: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.alert(
    `Не удалось завершить выход на всех устройствах для ${serverUrl}. Повторим автоматически при восстановлении сети.`,
  );
}

export function getLogoutQueueSize(): number {
  return logoutQueue.length;
}

export function __resetLogoutQueueForTests(): void {
  logoutQueue.length = 0;
  onlineListenerInitialized = false;
}

export async function flushLogoutQueue(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const pending = logoutQueue.splice(0);
  await Promise.all(
    pending.map(async (item) => {
      try {
        await fetch(`${item.serverUrl}/api/session/logout`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allDevices: item.allDevices }),
        });
      } catch {
        logoutQueue.push(item);
      }
    }),
  );
}

function ensureOnlineRetryListener(): void {
  if (typeof window === "undefined" || onlineListenerInitialized) {
    return;
  }

  window.addEventListener("online", () => {
    void flushLogoutQueue();
  });
  onlineListenerInitialized = true;
}

export async function logout(
  serverUrl: string,
  allDevices = false,
): Promise<void> {
  ensureOnlineRetryListener();
  const client = getServerClient(serverUrl);

  try {
    await client.post("/api/session/logout", { allDevices });
  } catch {
    logoutQueue.push({ serverUrl, allDevices });
    if (allDevices) {
      notifyAllDevicesLogoutFailure(serverUrl);
    }
  } finally {
    removeServerSession(serverUrl);
    removeServerClient(serverUrl);
  }
}
