import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import { selectedServerAtom } from "../state/store";
import {
  isSettingsOpenAtom,
  resolveSettingsTabsForSession,
  settingsActiveTabAtom,
  type SettingsTabId,
} from "../state/settingsOverlay";

function titleForTab(tabId: SettingsTabId): string {
  if (tabId === "main") return "Основные настройки сервера и интерфейса";
  if (tabId === "configurator") return "Параметры конфигуратора";
  if (tabId === "users") return "Управление пользователями и ролями";
  return "Профиль пользователя и личные настройки";
}

export function SettingsOverlay() {
  const selectedServer = useAtomValue(selectedServerAtom);
  const isOpen = useAtomValue(isSettingsOpenAtom);
  const setIsOpen = useSetAtom(isSettingsOpenAtom);
  const activeTab = useAtomValue(settingsActiveTabAtom);
  const setActiveTab = useSetAtom(settingsActiveTabAtom);
  const availableTabs = resolveSettingsTabsForSession(selectedServer);
  const safeActiveTab =
    availableTabs.find((tab) => tab.id === activeTab)?.id ?? availableTabs[0]?.id;

  useEffect(() => {
    if (!safeActiveTab || safeActiveTab === activeTab) {
      return;
    }
    setActiveTab(safeActiveTab);
  }, [activeTab, safeActiveTab, setActiveTab]);

  if (!isOpen || !safeActiveTab) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-base-content/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Настройки"
    >
      <section className="flex h-full w-full flex-col overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl">
        <header className="flex items-center justify-between gap-4 border-b border-base-300 px-4 py-3">
          <h2 className="text-lg font-semibold text-base-content">Настройки</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Закрыть настройки"
            onClick={() => setIsOpen(false)}
          >
            X
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav className="w-56 shrink-0 border-r border-base-300 p-2">
            <ul className="menu gap-1">
              {availableTabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={tab.id === safeActiveTab ? "active" : ""}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <h3 className="text-xl font-semibold capitalize">{safeActiveTab}</h3>
            <p className="mt-2 text-base-content/70">{titleForTab(safeActiveTab)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
