/**
 * Правило отображения «шестерёнки» в шапках колонок чата (песочница):
 * совпадение host клиента с `serverUrl` выбранного сервера и роль admin|root.
 */

export function clientMatchesServerUrl(serverUrl: string): boolean {
  try {
    const serverHost = new URL(serverUrl).host;
    if (typeof window === "undefined") return false;
    return serverHost === window.location.host;
  } catch {
    return false;
  }
}

export function roleAllowsHeaderGear(role: string): boolean {
  const normalized = role.trim().toLowerCase();
  return normalized === "admin" || normalized === "root";
}

export function shouldShowColumnHeaderGear(
  serverUrl: string | undefined,
  role: string | undefined,
): boolean {
  if (!serverUrl || !role) return false;
  return clientMatchesServerUrl(serverUrl) && roleAllowsHeaderGear(role);
}
