import { useEffect, useState, type FormEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import { selectedServerAtom } from "../state/store";
import {
  isSettingsOpenAtom,
  resolveSettingsTabsForSession,
  settingsActiveTabAtom,
  type SettingsTabId,
} from "../state/settingsOverlay";
import { setServerSession } from "../state/servers";

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
  const [serverNameDraft, setServerNameDraft] = useState("");

  useEffect(() => {
    setServerNameDraft(selectedServer?.name ?? "");
  }, [selectedServer?.name, selectedServer?.serverUrl]);

  useEffect(() => {
    if (!safeActiveTab || safeActiveTab === activeTab) {
      return;
    }
    setActiveTab(safeActiveTab);
  }, [activeTab, safeActiveTab, setActiveTab]);

  if (!isOpen || !safeActiveTab) {
    return null;
  }

  function onGeneralSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedServer) {
      return;
    }

    const trimmedName = serverNameDraft.trim();
    setServerSession({
      ...selectedServer,
      name: trimmedName || undefined,
    });
  }

  function onConfiguratorSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function renderTabContent() {
    if (safeActiveTab === "main") {
      return (
        <form className="flex max-w-xl flex-col gap-4" onSubmit={onGeneralSave}>
          <label className="form-control w-full" htmlFor="settings-server-name">
            <span className="label">
              <span className="label-text">Название сервера</span>
            </span>
            <input
              id="settings-server-name"
              className="input input-bordered w-full"
              type="text"
              placeholder="Введите название"
              value={serverNameDraft}
              onChange={(event) => setServerNameDraft(event.target.value)}
              disabled={!selectedServer}
            />
          </label>
          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedServer}
            >
              Сохранить
            </button>
          </div>
        </form>
      );
    }

    if (safeActiveTab === "configurator") {
      return (
        <form
          className="flex max-w-xl flex-col gap-4"
          onSubmit={onConfiguratorSave}
        >
          <label
            className="form-control w-full"
            htmlFor="settings-configurator-frequency"
          >
            <span className="label">
              <span className="label-text">Частота отправки запросов</span>
            </span>
            <input
              id="settings-configurator-frequency"
              className="input input-bordered w-full"
              type="text"
              value="Скоро будет доступно"
              disabled
              readOnly
            />
          </label>
          <div>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      );
    }

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
            <div className="mt-6">{renderTabContent()}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
