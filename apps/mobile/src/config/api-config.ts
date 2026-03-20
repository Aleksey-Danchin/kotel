const DEFAULT_API_HOST_HEADER = "kotel.localhost";

function readRequiredEnv(name: string, fallback?: string): string {
  const value = (process.env[name] ?? fallback)?.trim();

  if (!value) {
    throw new Error(
      `[mobile][config] Missing required env "${name}". Set it in mobile service environment.`,
    );
  }

  return value;
}

function validateApiBaseUrl(rawValue: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawValue);
  } catch {
    throw new Error(
      `[mobile][config] EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL. Received: "${rawValue}".`,
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      `[mobile][config] EXPO_PUBLIC_API_BASE_URL must use HTTPS for Traefik routing. Received protocol: "${parsedUrl.protocol}".`,
    );
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

export const apiConfig = Object.freeze({
  baseUrl: validateApiBaseUrl(readRequiredEnv("EXPO_PUBLIC_API_BASE_URL")),
  hostHeader: readRequiredEnv(
    "EXPO_PUBLIC_API_HOST_HEADER",
    DEFAULT_API_HOST_HEADER,
  ),
});
