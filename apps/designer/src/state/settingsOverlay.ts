import { atom } from "jotai";

import { clientMatchesServerUrl, roleAllowsHeaderGear } from "./headerGear";
import type { ServerSession } from "./servers";

export type SettingsTabId = "main" | "configurator" | "users" | "account";
export type SettingsOpenSource = "services" | "chats" | "chat";

export interface SettingsTabDefinition {
  id: SettingsTabId;
  label: string;
}

export const SETTINGS_TABS: SettingsTabDefinition[] = [
  { id: "main", label: "основной" },
  { id: "configurator", label: "конфигуратор" },
  { id: "users", label: "пользователи" },
  { id: "account", label: "аккаунт" },
];

const DEFAULT_TAB_BY_SOURCE: Record<SettingsOpenSource, SettingsTabId> = {
  services: "main",
  chats: "configurator",
  chat: "users",
};

export function initialSettingsTabForSource(
  source: SettingsOpenSource,
): SettingsTabId {
  return DEFAULT_TAB_BY_SOURCE[source];
}

export function resolveSettingsTabsForSession(
  session: ServerSession | null,
): SettingsTabDefinition[] {
  if (!session) {
    return SETTINGS_TABS.filter((tab) => tab.id === "account");
  }

  const isPrivilegedRole = roleAllowsHeaderGear(session.user.role);
  const isCurrentServer = clientMatchesServerUrl(session.serverUrl);
  if (isPrivilegedRole && isCurrentServer) {
    return SETTINGS_TABS;
  }

  return SETTINGS_TABS.filter((tab) => tab.id === "account");
}

export const isSettingsOpenAtom = atom(false);
export const settingsInitialTabAtom = atom<SettingsTabId>("main");
export const settingsActiveTabAtom = atom<SettingsTabId>("main");
