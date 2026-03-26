import type { ServerSession } from "./servers";

/** Host из URL с заменой ':' на '.' (для сегмента маршрута). */
export function serverRouteIdFromServerUrl(serverUrl: string): string {
  return new URL(serverUrl).host.replace(/:/g, ".");
}

export function serverUrlFromServersByRouteId(
  serversMap: Map<string, ServerSession>,
  routeId: string,
): string | null {
  for (const session of serversMap.values()) {
    try {
      if (serverRouteIdFromServerUrl(session.serverUrl) === routeId) {
        return session.serverUrl;
      }
    } catch {
      continue;
    }
  }
  return null;
}
