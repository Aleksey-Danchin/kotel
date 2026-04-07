/** Первые сегменты путей, которые не считаются динамическим выбором сервера/чата. */
export const DESIGNER_STATIC_ROUTE_SEGMENTS = new Set([
  "setup",
  "session-test",
  "users",
  "callback",
]);

export type DesignerRoutePath =
  | { kind: "index" }
  | { kind: "config" }
  | { kind: "config-server"; serverId: string }
  | { kind: "server"; serverId: string }
  | { kind: "server-chat"; serverId: string; chatId: string };

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Разбор pathname по иерархическому контракту маршрутов дизайнер-песочницы. */
export function resolveDesignerRoutePath(pathname: string): DesignerRoutePath {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return { kind: "index" };
  const first = parts[0];
  if (!first || DESIGNER_STATIC_ROUTE_SEGMENTS.has(first)) {
    return { kind: "index" };
  }

  if (first === "config") {
    if (parts.length === 1) {
      return { kind: "config" };
    }
    return { kind: "config-server", serverId: decodeSegment(parts[1] ?? "") };
  }

  if (parts.length === 1) {
    return { kind: "server", serverId: decodeSegment(first) };
  }

  return {
    kind: "server-chat",
    serverId: decodeSegment(first),
    chatId: decodeSegment(parts[1] ?? ""),
  };
}
