import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { saveTokens } from "@/src/api/secure-store";

const REDIRECT_URI = Linking.createURL("auth/callback");
const CODE_CHALLENGE_METHOD = "S256";
const PKCE_VERIFIER_BYTES = 32;

WebBrowser.maybeCompleteAuthSession();

type TokenExchangeResponse = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

export type SessionStatusResponse = {
  sessionId: string;
  user: {
    id: string;
    fullname: string;
    login?: string;
    role: string;
  };
};

function toBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const chunk =
      (bytes[index] << 16) |
      ((bytes[index + 1] ?? 0) << 8) |
      (bytes[index + 2] ?? 0);
    output += alphabet[(chunk >> 18) & 63];
    output += alphabet[(chunk >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(chunk >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[chunk & 63] : "=";
  }

  return output;
}

async function createPkcePair(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const bytes = Crypto.getRandomBytes(PKCE_VERIFIER_BYTES);
  const codeVerifier = toBase64Url(encodeBase64(bytes));
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );

  return {
    codeVerifier,
    codeChallenge: toBase64Url(digest),
  };
}

function assertAbsoluteUrl(serverUrl: string): string {
  const parsed = new URL(serverUrl);
  return parsed.toString().replace(/\/$/, "");
}

function toMobileNetworkUrl(serverUrl: string): string {
  const parsed = new URL(serverUrl);
  const isIpv4Host = /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname);
  if (isIpv4Host && parsed.protocol === "https:") {
    parsed.protocol = "http:";
  }
  return parsed.toString().replace(/\/$/, "");
}

function assertValue(
  value: string | undefined,
  name: string,
  callbackUrl: string,
): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `OAuth callback is missing "${name}" in URL: ${callbackUrl}`,
    );
  }

  return value;
}

async function exchangeCodeForTokens(
  serverUrl: string,
  code: string,
  codeVerifier: string,
): Promise<TokenExchangeResponse> {
  const networkUrl = toMobileNetworkUrl(serverUrl);
  const response = await fetch(`${networkUrl}/api/auth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  const body = (await response.json()) as Partial<TokenExchangeResponse>;
  if (!body.accessToken || !body.refreshToken || !body.sessionId) {
    throw new Error("Token exchange response is missing required fields");
  }

  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    sessionId: body.sessionId,
  };
}

async function getSessionStatus(
  serverUrl: string,
  accessToken: string,
): Promise<SessionStatusResponse> {
  const networkUrl = toMobileNetworkUrl(serverUrl);
  const response = await fetch(`${networkUrl}/api/session/status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Session status request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as SessionStatusResponse;
}

export async function addMobileServer(
  serverUrl: string,
): Promise<SessionStatusResponse> {
  const normalizedServerUrl = assertAbsoluteUrl(serverUrl);
  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = Crypto.randomUUID();
  const authUrl = new URL(`${normalizedServerUrl}/api/auth/login`);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", CODE_CHALLENGE_METHOD);
  authUrl.searchParams.set("state", state);

  const authResult = await WebBrowser.openAuthSessionAsync(
    authUrl.toString(),
    REDIRECT_URI,
  );

  if (authResult.type !== "success" || !authResult.url) {
    throw new Error(
      `OAuth flow did not complete successfully: ${authResult.type}`,
    );
  }

  const callbackUrl = new URL(authResult.url);
  const callbackCode = assertValue(
    callbackUrl.searchParams.get("code") ?? undefined,
    "code",
    authResult.url,
  );
  const callbackState = assertValue(
    callbackUrl.searchParams.get("state") ?? undefined,
    "state",
    authResult.url,
  );

  if (callbackState !== state) {
    throw new Error("OAuth state mismatch");
  }

  const tokens = await exchangeCodeForTokens(
    normalizedServerUrl,
    callbackCode,
    codeVerifier,
  );
  await saveTokens(
    normalizedServerUrl,
    tokens.accessToken,
    tokens.refreshToken,
  );

  return getSessionStatus(normalizedServerUrl, tokens.accessToken);
}
