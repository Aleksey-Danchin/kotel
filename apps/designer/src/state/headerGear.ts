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
