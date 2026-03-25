/** Первые сегменты путей, которые не считаются selection id (не перехватываются `/$id`). */
export const DESIGNER_STATIC_ROUTE_SEGMENTS = new Set([
  "setup",
  "session-test",
  "users",
  "callback",
]);

/** Сегмент выбора из pathname или `null` для `/` и статических маршрутов. */
export function selectionIdFromPathname(pathname: string): string | null {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  if (!first || DESIGNER_STATIC_ROUTE_SEGMENTS.has(first)) return null;
  try {
    return decodeURIComponent(first);
  } catch {
    return first;
  }
}
