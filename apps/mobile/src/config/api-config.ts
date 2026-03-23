function readRequiredEnv(name: string, fallback?: string): string {
  const value = (process.env[name] ?? fallback)?.trim();

  if (!value) {
    throw new Error(
      `[mobile][config] Missing required env "${name}". Set it in mobile service environment.`,
    );
  }

  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
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

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(
      `[mobile][config] EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS. Received protocol: "${parsedUrl.protocol}".`,
    );
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

export const apiConfig = Object.freeze({
  baseUrl: validateApiBaseUrl(readRequiredEnv("EXPO_PUBLIC_API_BASE_URL")),
  hostHeader: readOptionalEnv("EXPO_PUBLIC_API_HOST_HEADER"),
});
