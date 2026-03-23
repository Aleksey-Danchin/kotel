import {
  removeServerSession,
  setServerSession,
} from "../state/servers";
import type { ServerSession } from "../state/servers";
import { getServerClient, removeServerClient } from "./create-server-client";

interface OAuthMessageData {
  code: string;
  state: string;
}

interface PendingFlow {
  serverUrl: string;
  state: string;
  verifier: string;
  resolve: (session: ServerSession) => void;
  reject: (error: Error) => void;
  popup: Window | null;
}

interface SessionStatusResponse {
  sessionId: string;
  user: {
    id: string;
    fullname: string;
    login: string;
    role: string;
  };
}

const pendingFlows = new Map<string, PendingFlow>();
let messageListenerInitialized = false;

function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function storageStateKey(serverUrl: string): string {
  return `oauth_state_${serverUrl}`;
}

function storageVerifierKey(serverUrl: string): string {
  return `oauth_verifier_${serverUrl}`;
}

async function createPkcePair(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const verifierBuffer = new Uint8Array(64);
  crypto.getRandomValues(verifierBuffer);
  const codeVerifier = toBase64Url(verifierBuffer);

  const verifierBytes = new TextEncoder().encode(codeVerifier);
  const digestBuffer = await crypto.subtle.digest("SHA-256", verifierBytes);
  const codeChallenge = toBase64Url(new Uint8Array(digestBuffer));

  return { codeVerifier, codeChallenge };
}

function ensureMessageListener(): void {
  if (messageListenerInitialized) {
    return;
  }

  window.addEventListener("message", (event: MessageEvent<OAuthMessageData>) => {
    void handleMessageEvent(event);
  });
  messageListenerInitialized = true;
}

async function handleMessageEvent(
  event: MessageEvent<OAuthMessageData>,
): Promise<void> {
  if (event.origin !== window.location.origin) {
    return;
  }

  const code = event.data?.code;
  const state = event.data?.state;
  if (!code || !state) {
    return;
  }

  const pendingFlow = pendingFlows.get(state);
  if (!pendingFlow) {
    return;
  }
  pendingFlows.delete(state);

  try {
    if (pendingFlow.state !== state) {
      throw new Error("OAuth state mismatch");
    }

    const expectedState = sessionStorage.getItem(
      storageStateKey(pendingFlow.serverUrl),
    );
    if (expectedState !== state) {
      throw new Error("OAuth state mismatch");
    }

    const verifier =
      sessionStorage.getItem(storageVerifierKey(pendingFlow.serverUrl)) ??
      pendingFlow.verifier;
    if (!verifier) {
      throw new Error("PKCE verifier is missing");
    }

    const session = await exchangeCode(pendingFlow.serverUrl, code, verifier);
    setServerSession(session);
    pendingFlow.resolve(session);
  } catch (error) {
    pendingFlow.reject(
      error instanceof Error ? error : new Error("OAuth callback failed"),
    );
  } finally {
    sessionStorage.removeItem(storageStateKey(pendingFlow.serverUrl));
    sessionStorage.removeItem(storageVerifierKey(pendingFlow.serverUrl));
  }
}

function clearFlow(serverUrl: string, state: string): void {
  pendingFlows.delete(state);
  sessionStorage.removeItem(storageStateKey(serverUrl));
  sessionStorage.removeItem(storageVerifierKey(serverUrl));
}

function watchPopupClosed(state: string): void {
  const pendingFlow = pendingFlows.get(state);
  if (!pendingFlow) {
    return;
  }

  const interval = window.setInterval(() => {
    const currentFlow = pendingFlows.get(state);
    if (!currentFlow) {
      window.clearInterval(interval);
      return;
    }

    if (!currentFlow.popup || currentFlow.popup.closed) {
      clearFlow(currentFlow.serverUrl, state);
      currentFlow.reject(
        new Error("Authentication popup was closed before completion"),
      );
      window.clearInterval(interval);
    }
  }, 400);
}

export async function exchangeCode(
  serverUrl: string,
  code: string,
  codeVerifier: string,
): Promise<ServerSession> {
  const response = await fetch(`${serverUrl}/api/auth/token`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, codeVerifier }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed for ${serverUrl}`);
  }

  const client = getServerClient(serverUrl);
  const statusResponse = await client.get<SessionStatusResponse>(
    "/api/session/status",
  );
  const payload = statusResponse.data;
  return {
    serverUrl,
    sessionId: payload.sessionId,
    user: payload.user,
  };
}

export async function addServer(serverUrl: string): Promise<ServerSession> {
  ensureMessageListener();

  const { codeVerifier, codeChallenge } = await createPkcePair();
  const state = crypto.randomUUID();
  sessionStorage.setItem(storageStateKey(serverUrl), state);
  sessionStorage.setItem(storageVerifierKey(serverUrl), codeVerifier);

  const authUrl = new URL(`${serverUrl}/api/auth/login`);
  authUrl.searchParams.set("redirect_uri", `${window.location.origin}/callback`);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  const popup = window.open(authUrl.toString(), "auth", "width=500,height=600");
  if (!popup) {
    clearFlow(serverUrl, state);
    throw new Error("Authentication popup was blocked by browser");
  }

  return new Promise<ServerSession>((resolve, reject) => {
    pendingFlows.set(state, {
      serverUrl,
      state,
      verifier: codeVerifier,
      resolve,
      reject,
      popup,
    });
    watchPopupClosed(state);
  });
}

export async function removeServer(serverUrl: string): Promise<void> {
  try {
    await fetch(`${serverUrl}/api/session/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    removeServerSession(serverUrl);
    removeServerClient(serverUrl);
    sessionStorage.removeItem(storageStateKey(serverUrl));
    sessionStorage.removeItem(storageVerifierKey(serverUrl));
  }
}

export function initAuthMessageListener(): void {
  ensureMessageListener();
}

export function __resetAuthForTests(): void {
  for (const [state, flow] of pendingFlows.entries()) {
    clearFlow(flow.serverUrl, state);
  }
  pendingFlows.clear();
  messageListenerInitialized = false;
}
