const ports = new Set<MessagePort>();
const refreshing = new Map<string, Promise<boolean>>();

type RefreshRequestMessage = {
  type: "refresh";
  serverUrl: string;
};

type RefreshResponseMessage = {
  type: "refreshed" | "refresh_failed";
  serverUrl: string;
};

function postToPort(port: MessagePort, message: RefreshResponseMessage): void {
  try {
    port.postMessage(message);
  } catch {
    ports.delete(port);
  }
}

function broadcast(message: RefreshResponseMessage): void {
  ports.forEach((port) => {
    postToPort(port, message);
  });
}

async function doRefresh(serverUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${serverUrl}/api/session/refresh`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function isRefreshRequestMessage(data: unknown): data is RefreshRequestMessage {
  if (!data || typeof data !== "object") {
    return false;
  }

  const message = data as Partial<RefreshRequestMessage>;
  return message.type === "refresh" && typeof message.serverUrl === "string";
}

const context = self as unknown as SharedWorkerGlobalScope;

context.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  if (!port) {
    return;
  }

  ports.add(port);
  port.start();

  port.addEventListener("message", async (messageEvent: MessageEvent) => {
    if (!isRefreshRequestMessage(messageEvent.data)) {
      return;
    }

    const { serverUrl } = messageEvent.data;

    if (refreshing.has(serverUrl)) {
      const existingResult = await refreshing.get(serverUrl);
      postToPort(port, {
        type: existingResult ? "refreshed" : "refresh_failed",
        serverUrl,
      });
      return;
    }

    const refreshPromise = doRefresh(serverUrl);
    refreshing.set(serverUrl, refreshPromise);

    const isOk = await refreshPromise;
    refreshing.delete(serverUrl);

    broadcast({
      type: isOk ? "refreshed" : "refresh_failed",
      serverUrl,
    });
  });
};
