import { useEffect, useState, type FormEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";

import {
  allSessionsAtom,
  allUsersForSelectedServerAtom,
  createServerUser,
  isCurrentSession,
  removeAllSessions,
  removeAllSessionsExcept,
  removeCurrentSession,
  removeSessionById,
  resolveCatalogServerId,
  selectedServerAtom,
  updateServerUser,
  usersDataRevisionAtom,
} from "../state/store";
import {
  isSettingsOpenAtom,
  resolveSettingsTabsForSession,
  settingsActiveTabAtom,
  type SettingsTabId,
} from "../state/settingsOverlay";
import {
  generateUserPassword,
  normalizeRole,
  resolveUserEditability,
} from "../state/settingsUsers";
import { setServerSession } from "../state/servers";

type AccountConfirmAction =
  | "demote-admin"
  | "remove-session"
  | "remove-current-session"
  | "remove-all-sessions"
  | "remove-all-except-current";

function formatSessionLifetime(createdAt: string): string {
  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return "Неизвестно";
  }

  const diffMs = Math.max(0, Date.now() - createdAtMs);
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) {
    return "меньше минуты";
  }
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const restMinutes = minutes % 60;
    return restMinutes === 0 ? `${hours} ч` : `${hours} ч ${restMinutes} мин`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days} д` : `${days} д ${restHours} ч`;
}

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
  const usersRevision = useAtomValue(usersDataRevisionAtom);
  const serverUsers = useAtomValue(allUsersForSelectedServerAtom);
  const allSessions = useAtomValue(allSessionsAtom);
  const availableTabs = resolveSettingsTabsForSession(selectedServer);
  const safeActiveTab =
    availableTabs.find((tab) => tab.id === activeTab)?.id ?? availableTabs[0]?.id;
  const [serverNameDraft, setServerNameDraft] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState({
    login: "",
    fullname: "",
    password: "",
    blocked: false,
    role: "USER",
  });
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserDraft, setAddUserDraft] = useState({
    login: "",
    fullname: "",
    password: "",
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState({
    login: "",
    fullname: "",
    password: "",
  });
  const [confirmAction, setConfirmAction] = useState<AccountConfirmAction | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    setServerNameDraft(selectedServer?.name ?? "");
  }, [selectedServer?.name, selectedServer?.serverUrl]);

  useEffect(() => {
    if (!safeActiveTab || safeActiveTab === activeTab) {
      return;
    }
    setActiveTab(safeActiveTab);
  }, [activeTab, safeActiveTab, setActiveTab]);

  useEffect(() => {
    if (safeActiveTab !== "users") {
      return;
    }
    if (serverUsers.length === 0) {
      setSelectedUserId(null);
      return;
    }
    const exists = serverUsers.some((user) => user.id === selectedUserId);
    if (!exists) {
      setSelectedUserId(serverUsers[0]?.id ?? null);
    }
  }, [safeActiveTab, serverUsers, selectedUserId, usersRevision]);

  const selectedUser =
    safeActiveTab === "users"
      ? serverUsers.find((user) => user.id === selectedUserId) ?? null
      : null;
  const selectedUserRole = normalizeRole(selectedUser?.role ?? "");
  const editability = resolveUserEditability(
    selectedServer?.user.role ?? "",
    selectedUser?.role ?? "",
  );

  useEffect(() => {
    if (!selectedUser) {
      setUserDraft({
        login: "",
        fullname: "",
        password: "",
        blocked: false,
        role: "USER",
      });
      return;
    }

    setUserDraft({
      login: selectedUser.login,
      fullname: selectedUser.fullname,
      password: selectedUser.password ?? "",
      blocked: selectedUser.blocked ?? false,
      role: selectedUserRole ?? "USER",
    });
  }, [
    selectedUser?.id,
    selectedUser?.login,
    selectedUser?.fullname,
    selectedUser?.password,
    selectedUser?.blocked,
    selectedUserRole,
  ]);

  useEffect(() => {
    if (!selectedServer) {
      setAccountDraft({ login: "", fullname: "", password: "" });
      return;
    }
    setAccountDraft({
      login: selectedServer.user.login,
      fullname: selectedServer.user.fullname,
      password: "",
    });
  }, [
    selectedServer?.serverUrl,
    selectedServer?.user.login,
    selectedServer?.user.fullname,
  ]);

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

  function onUserSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || !editability.canEdit) {
      return;
    }

    updateServerUser({
      id: selectedUser.id,
      login: userDraft.login.trim(),
      fullname: userDraft.fullname.trim(),
      password: userDraft.password,
      blocked: userDraft.blocked,
      role: editability.canChangeRole ? userDraft.role : selectedUser.role,
    });
  }

  function onCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedServer) {
      return;
    }

    const login = addUserDraft.login.trim();
    const fullname = addUserDraft.fullname.trim();
    const password = addUserDraft.password.trim();
    if (!login || !fullname || !password) {
      setAddUserError("Заполните все поля");
      return;
    }

    const created = createServerUser({
      serverId: resolveCatalogServerId(selectedServer),
      login,
      fullname,
      password,
    });
    setIsAddUserModalOpen(false);
    setAddUserError(null);
    setAddUserDraft({ login: "", fullname: "", password: "" });
    setSelectedUserId(created.id);
  }

  function onSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedServer) {
      return;
    }
    setServerSession({
      ...selectedServer,
      user: {
        ...selectedServer.user,
        login: accountDraft.login.trim(),
        fullname: accountDraft.fullname.trim(),
      },
    });
  }

  function onConfirmAccountAction() {
    if (!selectedServer || !confirmAction) {
      return;
    }
    const currentServerId = resolveCatalogServerId(selectedServer);

    if (confirmAction === "demote-admin") {
      setServerSession({
        ...selectedServer,
        user: {
          ...selectedServer.user,
          role: "USER",
        },
      });
    } else if (confirmAction === "remove-current-session") {
      removeCurrentSession(currentServerId);
    } else if (confirmAction === "remove-all-sessions") {
      removeAllSessions();
    } else if (confirmAction === "remove-all-except-current") {
      removeAllSessionsExcept(currentServerId);
    } else if (confirmAction === "remove-session" && sessionToDelete) {
      removeSessionById(sessionToDelete);
    }

    setSessionToDelete(null);
    setConfirmAction(null);
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

    if (safeActiveTab === "users") {
      return (
        <div className="flex min-h-[420px] gap-4">
          <section className="w-72 shrink-0 rounded-box border border-base-300">
            <header className="flex items-center justify-between border-b border-base-300 px-3 py-2">
              <h4 className="font-medium">Пользователи</h4>
              <button
                type="button"
                className="btn btn-primary btn-xs"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                Добавить пользователя
              </button>
            </header>
            <div className="max-h-[360px] overflow-y-auto p-2">
              <ul className="menu gap-1">
                {serverUsers.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={user.id === selectedUserId ? "active" : ""}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="truncate">{user.fullname}</span>
                        <span className="badge badge-ghost badge-sm">
                          {normalizeRole(user.role) ?? user.role.toUpperCase()}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="min-w-0 flex-1 rounded-box border border-base-300 p-4">
            {!selectedUser ? (
              <p className="text-base-content/70">Пользователь не выбран</p>
            ) : (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={onUserSave}>
                <label className="form-control w-full">
                  <span className="label">
                    <span className="label-text">Логин</span>
                  </span>
                  <input
                    className="input input-bordered w-full"
                    type="text"
                    value={userDraft.login}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, login: event.target.value }))
                    }
                    disabled={!editability.canEdit}
                  />
                </label>

                <label className="form-control w-full">
                  <span className="label">
                    <span className="label-text">ФИО</span>
                  </span>
                  <input
                    className="input input-bordered w-full"
                    type="text"
                    value={userDraft.fullname}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, fullname: event.target.value }))
                    }
                    disabled={!editability.canEdit}
                  />
                </label>

                <label className="form-control w-full">
                  <span className="label">
                    <span className="label-text">Пароль</span>
                  </span>
                  <input
                    className="input input-bordered w-full"
                    type="text"
                    value={userDraft.password}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, password: event.target.value }))
                    }
                    disabled={!editability.canEdit}
                  />
                </label>

                <label className="form-control w-full">
                  <span className="label">
                    <span className="label-text">Роль</span>
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={userDraft.role}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, role: event.target.value }))
                    }
                    disabled={!editability.canChangeRole}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                    <option value="ROOT">ROOT</option>
                  </select>
                </label>

                <label className="form-control w-full">
                  <span className="label">
                    <span className="label-text">Статус блокировки</span>
                  </span>
                  <input
                    className="toggle"
                    type="checkbox"
                    checked={userDraft.blocked}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, blocked: event.target.checked }))
                    }
                    disabled={!editability.canEdit}
                  />
                </label>

                <label className="form-control w-full">
                  <span className="label">
                    <span className="label-text">Частота запросов</span>
                  </span>
                  <input
                    className="input input-bordered w-full"
                    type="text"
                    value="Скоро будет доступно"
                    disabled
                    readOnly
                  />
                </label>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!editability.canEdit}
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      );
    }

    if (safeActiveTab === "account") {
      const currentServerId = selectedServer
        ? resolveCatalogServerId(selectedServer)
        : null;
      const sessionsSorted = [...allSessions].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );

      return (
        <div className="space-y-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSaveAccount}>
            <label className="form-control w-full">
              <span className="label">
                <span className="label-text">Логин</span>
              </span>
              <input
                className="input input-bordered w-full"
                type="text"
                value={accountDraft.login}
                onChange={(event) =>
                  setAccountDraft((prev) => ({ ...prev, login: event.target.value }))
                }
                disabled={!selectedServer}
              />
            </label>

            <label className="form-control w-full">
              <span className="label">
                <span className="label-text">ФИО</span>
              </span>
              <input
                className="input input-bordered w-full"
                type="text"
                value={accountDraft.fullname}
                onChange={(event) =>
                  setAccountDraft((prev) => ({ ...prev, fullname: event.target.value }))
                }
                disabled={!selectedServer}
              />
            </label>

            <label className="form-control w-full">
              <span className="label">
                <span className="label-text">Пароль</span>
              </span>
              <input
                className="input input-bordered w-full"
                type="password"
                value={accountDraft.password}
                onChange={(event) =>
                  setAccountDraft((prev) => ({ ...prev, password: event.target.value }))
                }
                disabled={!selectedServer}
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedServer}
              >
                Сохранить
              </button>
            </div>
          </form>

          {selectedServer?.user.role.trim().toUpperCase() === "ADMIN" ? (
            <section className="rounded-box border border-warning/30 bg-warning/10 p-4">
              <h4 className="font-medium">Права администратора</h4>
              <button
                type="button"
                className="btn btn-warning btn-sm mt-3"
                onClick={() => setConfirmAction("demote-admin")}
              >
                Перестать быть админом
              </button>
            </section>
          ) : null}

          <section className="rounded-box border border-base-300 p-4">
            <h4 className="font-medium">Завершить сессию</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmAction("remove-current-session")}
                disabled={!currentServerId}
              >
                Завершить текущую сессию
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmAction("remove-all-sessions")}
                disabled={allSessions.length === 0}
              >
                Завершить все сессии
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmAction("remove-all-except-current")}
                disabled={!currentServerId}
              >
                Завершить все сессии, кроме текущей
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Сессия</th>
                    <th>Сервер</th>
                    <th>Активна</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {sessionsSorted.map((session) => {
                    const isCurrent = isCurrentSession(session, currentServerId);
                    return (
                      <tr key={session.id}>
                        <td>{session.id}</td>
                        <td>{session.serverId}</td>
                        <td>{formatSessionLifetime(session.createdAt)}</td>
                        <td>
                          {isCurrent ? null : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              aria-label={`Удалить сессию ${session.id}`}
                              onClick={() => {
                                setSessionToDelete(session.id);
                                setConfirmAction("remove-session");
                              }}
                            >
                              X
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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

      {isAddUserModalOpen ? (
        <div className="absolute inset-0 flex items-center justify-center bg-base-content/40 p-4">
          <section className="w-full max-w-md rounded-box bg-base-100 p-5 shadow-lg">
            <h4 className="text-lg font-semibold">Добавить пользователя</h4>
            <form className="mt-4 space-y-3" onSubmit={onCreateUser}>
              <label className="form-control w-full">
                <span className="label">
                  <span className="label-text">Логин</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  type="text"
                  value={addUserDraft.login}
                  onChange={(event) =>
                    setAddUserDraft((prev) => ({ ...prev, login: event.target.value }))
                  }
                />
              </label>
              <label className="form-control w-full">
                <span className="label">
                  <span className="label-text">ФИО</span>
                </span>
                <input
                  className="input input-bordered w-full"
                  type="text"
                  value={addUserDraft.fullname}
                  onChange={(event) =>
                    setAddUserDraft((prev) => ({ ...prev, fullname: event.target.value }))
                  }
                />
              </label>
              <label className="form-control w-full">
                <span className="label">
                  <span className="label-text">Пароль</span>
                </span>
                <div className="flex items-center gap-2">
                  <input
                    className="input input-bordered w-full"
                    type="text"
                    value={addUserDraft.password}
                    onChange={(event) =>
                      setAddUserDraft((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setAddUserDraft((prev) => ({
                        ...prev,
                        password: generateUserPassword(12),
                      }))
                    }
                  >
                    Сгенерировать
                  </button>
                </div>
              </label>

              {addUserError ? (
                <p className="text-sm text-error" role="alert">
                  {addUserError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsAddUserModalOpen(false);
                    setAddUserError(null);
                    setAddUserDraft({ login: "", fullname: "", password: "" });
                  }}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Создать
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="absolute inset-0 flex items-center justify-center bg-base-content/40 p-4">
          <section className="w-full max-w-md rounded-box bg-base-100 p-5 shadow-lg">
            <h4 className="text-lg font-semibold">Подтверждение</h4>
            <p className="mt-3 text-base-content/80">
              {confirmAction === "demote-admin"
                ? "После подтверждения ваша роль изменится на USER."
                : confirmAction === "remove-session"
                  ? "Завершить выбранную сессию?"
                  : confirmAction === "remove-current-session"
                    ? "Завершить текущую сессию?"
                    : confirmAction === "remove-all-sessions"
                      ? "Завершить все активные сессии?"
                      : "Завершить все сессии, кроме текущей?"}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setConfirmAction(null);
                  setSessionToDelete(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirmAccountAction}
              >
                Подтвердить
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
