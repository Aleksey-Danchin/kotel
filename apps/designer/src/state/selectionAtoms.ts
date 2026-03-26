import { atomWithStorage } from "jotai/vanilla/utils";

import { serverRouteIdFromServerUrl } from "./serverRouteId";

const ACTIVE_SERVER_ID_STORAGE_KEY = "kotel.designer.activeServerId";
const LEGACY_ACTIVE_SERVER_URL_KEY = "kotel.designer.activeServerUrl";
const LAST_CHAT_BY_SERVER_KEY = "kotel.designer.lastChatByServerId";
const LEGACY_SELECTED_CHAT_KEY = "kotel.designer.selectedChatId";

export type LastChatByServerId = Record<string, string>;

function runStorageMigrationOnce(): void {
  if (typeof localStorage === "undefined") return;

  if (!localStorage.getItem(LAST_CHAT_BY_SERVER_KEY)) {
    const legacyChat = localStorage.getItem(LEGACY_SELECTED_CHAT_KEY);
    const legacyUrl = localStorage.getItem(LEGACY_ACTIVE_SERVER_URL_KEY);
    if (legacyChat?.trim() && legacyUrl?.trim()) {
      try {
        const sid = serverRouteIdFromServerUrl(legacyUrl.trim());
        localStorage.setItem(
          LAST_CHAT_BY_SERVER_KEY,
          JSON.stringify({ [sid]: legacyChat.trim() }),
        );
      } catch {
        /* ignore */
      }
    }
  }

  if (!localStorage.getItem(ACTIVE_SERVER_ID_STORAGE_KEY)) {
    const legacyUrl = localStorage.getItem(LEGACY_ACTIVE_SERVER_URL_KEY);
    if (legacyUrl?.trim()) {
      try {
        localStorage.setItem(
          ACTIVE_SERVER_ID_STORAGE_KEY,
          serverRouteIdFromServerUrl(legacyUrl.trim()),
        );
      } catch {
        /* ignore */
      }
    }
  }

  localStorage.removeItem(LEGACY_SELECTED_CHAT_KEY);
  localStorage.removeItem(LEGACY_ACTIVE_SERVER_URL_KEY);
}

runStorageMigrationOnce();

export const activeServerIdAtom = atomWithStorage<string | null>(
  ACTIVE_SERVER_ID_STORAGE_KEY,
  null,
);

export const lastChatByServerIdAtom = atomWithStorage<LastChatByServerId>(
  LAST_CHAT_BY_SERVER_KEY,
  {},
);
