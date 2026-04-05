import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  PiClockCounterClockwise,
  PiGearSix,
  PiSlidersHorizontal,
  PiUserCircle,
  PiUsersThree,
} from "react-icons/pi";
import { BsCheckSquare, BsSquare } from "react-icons/bs";

import {
  createServerUser,
  getServerUsers,
  getSessionsForServerAndUser,
  isCurrentSession,
  removeAllSessionsForUser,
  removeAllSessionsExceptForUser,
  removeCurrentSessionForUser,
  removeSessionById,
  resolveCatalogServerId,
  serversListAtom,
  selectedServerAtom,
  updateServerUser,
  usersDataRevisionAtom,
} from "../state/store";
import {
  isSettingsOpenAtom,
  resolveSettingsTabsForSession,
  settingsActiveTabAtom,
  settingsServerUrlAtom,
  type SettingsTabId,
} from "../state/settingsOverlay";
import {
  generateUserPassword,
  normalizeRole,
  resolveUserEditability,
} from "../state/settingsUsers";
import { formatUserPresenceSubtitle } from "../state/userPresence";
import { shouldShowDesignerRoleBadge } from "../state/roles";
import { setServerSession } from "../state/servers";
import { isSearchMatch } from "../state/chatSearch";

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
  if (tabId === "sessions") return "Управление сессиями на сервере";
  return "Профиль пользователя и личные настройки";
}

function displayServerHost(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname;
  } catch {
    return serverUrl;
  }
}

function tabIcon(tabId: SettingsTabId) {
  if (tabId === "main")
    return <PiGearSix className="text-base" aria-hidden="true" />;
  if (tabId === "configurator") {
    return <PiSlidersHorizontal className="text-base" aria-hidden="true" />;
  }
  if (tabId === "users")
    return <PiUsersThree className="text-base" aria-hidden="true" />;
  if (tabId === "sessions") {
    return <PiClockCounterClockwise className="text-base" aria-hidden="true" />;
  }
  return <PiUserCircle className="text-base" aria-hidden="true" />;
}

type SessionClientType = "web" | "app";
type ReuseReactionMode = "debug" | "isolation" | "quarantine" | "lockdown";

function sessionClientType(sessionId: string): SessionClientType {
  let sum = 0;
  for (let index = 0; index < sessionId.length; index += 1) {
    sum += sessionId.charCodeAt(index) ?? 0;
  }
  return sum % 2 === 0 ? "web" : "app";
}

export function SettingsOverlay() {
  const routeSelectedServer = useAtomValue(selectedServerAtom);
  const serversList = useAtomValue(serversListAtom);
  const settingsServerUrl = useAtomValue(settingsServerUrlAtom);
  const setSettingsServerUrl = useSetAtom(settingsServerUrlAtom);
  const selectedServer =
    (settingsServerUrl
      ? serversList.find((server) => server.serverUrl === settingsServerUrl) ??
        null
      : null) ?? routeSelectedServer;
  const isOpen = useAtomValue(isSettingsOpenAtom);
  const setIsOpen = useSetAtom(isSettingsOpenAtom);
  const activeTab = useAtomValue(settingsActiveTabAtom);
  const setActiveTab = useSetAtom(settingsActiveTabAtom);
  const usersRevision = useAtomValue(usersDataRevisionAtom);
  const availableTabs = resolveSettingsTabsForSession(selectedServer);
  const settingsServerHost = selectedServer
    ? displayServerHost(selectedServer.serverUrl)
    : null;
  const settingsServerLabel = selectedServer
    ? selectedServer.name?.trim() || settingsServerHost || selectedServer.serverUrl
    : "Сервер не выбран";
  const selectedServerCatalogId = selectedServer
    ? resolveCatalogServerId(selectedServer)
    : null;
  const serverUsers = selectedServerCatalogId
    ? getServerUsers(selectedServerCatalogId)
    : [];
  const safeActiveTab =
    availableTabs.find((tab) => tab.id === activeTab)?.id ??
    availableTabs[0]?.id;
  const saveFormId =
    safeActiveTab === "main"
      ? "settings-main-form"
      : safeActiveTab === "configurator"
        ? "settings-configurator-form"
        : safeActiveTab === "users"
          ? "settings-users-form"
          : safeActiveTab === "account"
            ? "settings-account-form"
            : null;
  const usersTabLayout =
    safeActiveTab === "users" || safeActiveTab === "sessions";
  const [serverNameDraft, setServerNameDraft] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [usersSearch, setUsersSearch] = useState("");
  const [debouncedUsersSearch, setDebouncedUsersSearch] = useState("");
  const [reuseReactionMode, setReuseReactionMode] =
    useState<ReuseReactionMode>("debug");
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
  const [userPasswordDraft, setUserPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [accountDraft, setAccountDraft] = useState({
    login: "",
    fullname: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [confirmAction, setConfirmAction] =
    useState<AccountConfirmAction | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [sessionActionUserId, setSessionActionUserId] = useState<string | null>(
    null,
  );
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const usersDetailsColumnRef = useRef<HTMLDivElement | null>(null);
  const settingsServerDropdownTriggerRef = useRef<HTMLButtonElement | null>(
    null,
  );

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
    const usersForSelection = selectedServerCatalogId
      ? getServerUsers(selectedServerCatalogId)
      : [];
    if (usersForSelection.length === 0) {
      setSelectedUserId(null);
      return;
    }
    const exists = usersForSelection.some((user) => user.id === selectedUserId);
    if (!exists) {
      setSelectedUserId(usersForSelection[0]?.id ?? null);
    }
  }, [safeActiveTab, selectedServerCatalogId, selectedUserId, usersRevision]);

  const selectedUser =
    safeActiveTab === "users"
      ? (serverUsers.find((user) => user.id === selectedUserId) ?? null)
      : null;
  const selectedUserRole = normalizeRole(selectedUser?.role ?? "");
  const currentRole = normalizeRole(selectedServer?.user.role ?? "");
  const isRootUserHidden =
    selectedUserRole === "ROOT" &&
    selectedUser?.id !== undefined &&
    selectedUser?.id !== selectedServer?.user.id;
  const canManageSelectedUserSessions = Boolean(
    !isRootUserHidden &&
    selectedUser &&
    currentRole &&
    (currentRole === "ROOT" ||
      (currentRole === "ADMIN" && selectedUserRole !== "ROOT")),
  );
  const editability = resolveUserEditability(
    selectedServer?.user.role ?? "",
    selectedUser?.role ?? "",
  );
  const saveDisabled =
    !saveFormId ||
    (safeActiveTab === "main" && !selectedServer) ||
    (safeActiveTab === "users" &&
      (!selectedUser || !editability.canEdit || isRootUserHidden)) ||
    (safeActiveTab === "account" && !selectedServer);
  const isSelectedCurrentUser =
    selectedUser?.id !== undefined &&
    selectedUser?.id === selectedServer?.user.id;
  const usersSearchTrimmed = usersSearch.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedUsersSearch(usersSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [usersSearch]);

  useEffect(() => {
    if (!selectedUser) {
      setUserDraft({
        login: "",
        fullname: "",
        password: "",
        blocked: false,
        role: "USER",
      });
      setUserPasswordDraft({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
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
    setUserPasswordDraft({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
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
    if (safeActiveTab !== "users") {
      return;
    }
    usersDetailsColumnRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [safeActiveTab, selectedUser?.id]);

  useEffect(() => {
    if (!selectedServer) {
      setAccountDraft({
        login: "",
        fullname: "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      return;
    }
    setAccountDraft({
      login: selectedServer.user.login,
      fullname: selectedServer.user.fullname,
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
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
    if (!confirmAction) {
      return;
    }
    const currentServerId = selectedServer
      ? resolveCatalogServerId(selectedServer)
      : null;
    const actionUserId = sessionActionUserId ?? selectedServer?.user.id ?? null;

    if (confirmAction === "demote-admin" && selectedServer) {
      setServerSession({
        ...selectedServer,
        user: {
          ...selectedServer.user,
          role: "USER",
        },
      });
    } else if (
      confirmAction === "remove-current-session" &&
      currentServerId &&
      actionUserId
    ) {
      removeCurrentSessionForUser(currentServerId, actionUserId);
    } else if (confirmAction === "remove-all-sessions" && actionUserId) {
      removeAllSessionsForUser(actionUserId);
    } else if (
      confirmAction === "remove-all-except-current" &&
      currentServerId &&
      actionUserId
    ) {
      removeAllSessionsExceptForUser(currentServerId, actionUserId);
    } else if (confirmAction === "remove-session" && sessionToDelete) {
      removeSessionById(sessionToDelete);
    }

    setSessionToDelete(null);
    setSessionActionUserId(null);
    setConfirmAction(null);
  }

  function onRequestSave(): void {
    if (saveDisabled) return;
    setSaveConfirmOpen(true);
  }

  function onConfirmSave(): void {
    if (!saveFormId) return;
    const form = document.getElementById(saveFormId);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
    setSaveConfirmOpen(false);
  }

  function renderTabContent() {
    if (safeActiveTab === "main") {
      return (
        <section className="card border border-base-300 bg-base-100">
          <div className="card-body">
            <h4 className="card-title text-base">Сервер</h4>
            <form
              id="settings-main-form"
              className="flex max-w-xl flex-col gap-4"
              onSubmit={onGeneralSave}
            >
              <label
                className="form-control w-full"
                htmlFor="settings-server-name"
              >
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
              <label
                className="form-control w-full"
                htmlFor="settings-server-url"
              >
                <span className="label">
                  <span className="label-text">URL сервера</span>
                </span>
                <input
                  id="settings-server-url"
                  className="input input-bordered w-full"
                  type="text"
                  value={selectedServer?.serverUrl ?? ""}
                  disabled
                />
              </label>
            </form>
          </div>
        </section>
      );
    }

    if (safeActiveTab === "configurator") {
      return (
        <section className="card border border-base-300 bg-base-100">
          <div className="card-body">
            <h4 className="card-title text-base">Refresh Reuse Detection</h4>
            <form
              id="settings-configurator-form"
              className="flex max-w-xl flex-col gap-4"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="flex flex-col gap-4">
                <div className="join join-vertical w-full">
                  <button
                    type="button"
                    className={`btn join-item h-auto justify-start px-4 py-4 normal-case ${reuseReactionMode === "debug" ? "btn-primary border-primary! z-10" : "btn-outline border-gray-600 text-base-content"}`}
                    onClick={() => setReuseReactionMode("debug")}
                  >
                    <span className="flex w-full items-center gap-3">
                      <span className="flex w-5 shrink-0 items-center">
                        {reuseReactionMode === "debug" ? (
                          <BsCheckSquare
                            aria-hidden="true"
                            className="text-base"
                          />
                        ) : (
                          <BsSquare aria-hidden="true" className="text-base" />
                        )}
                      </span>
                      <span className="flex flex-col items-start gap-1.5">
                        <span className="font-semibold">Отладка</span>
                        <span className="text-xs font-normal opacity-80">
                          Минимальные ограничения, расширенные логи для анализа.
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`btn join-item h-auto justify-start px-4 py-4 normal-case ${reuseReactionMode === "isolation" ? "btn-primary border-primary! z-10" : "btn-outline border-gray-600 text-base-content"}`}
                    onClick={() => setReuseReactionMode("isolation")}
                  >
                    <span className="flex w-full items-center gap-3">
                      <span className="flex w-5 shrink-0 items-center">
                        {reuseReactionMode === "isolation" ? (
                          <BsCheckSquare
                            aria-hidden="true"
                            className="text-base"
                          />
                        ) : (
                          <BsSquare aria-hidden="true" className="text-base" />
                        )}
                      </span>
                      <span className="flex flex-col items-start gap-1.5">
                        <span className="font-semibold">Изоляция</span>
                        <span className="text-xs font-normal opacity-80">
                          Ограничение действий в рамках изолированного контура.
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`btn join-item h-auto justify-start px-4 py-4 normal-case ${reuseReactionMode === "quarantine" ? "btn-primary border-primary! z-10" : "btn-outline border-gray-600 text-base-content"}`}
                    onClick={() => setReuseReactionMode("quarantine")}
                  >
                    <span className="flex w-full items-center gap-3">
                      <span className="flex w-5 shrink-0 items-center">
                        {reuseReactionMode === "quarantine" ? (
                          <BsCheckSquare
                            aria-hidden="true"
                            className="text-base"
                          />
                        ) : (
                          <BsSquare aria-hidden="true" className="text-base" />
                        )}
                      </span>
                      <span className="flex flex-col items-start gap-1.5">
                        <span className="font-semibold">Карантин</span>
                        <span className="text-xs font-normal opacity-80">
                          Временная блокировка подозрительных операций и сессий.
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`btn join-item h-auto justify-start px-4 py-4 normal-case ${reuseReactionMode === "lockdown" ? "btn-primary border-primary! z-10" : "btn-outline border-gray-600 text-base-content"}`}
                    onClick={() => setReuseReactionMode("lockdown")}
                  >
                    <span className="flex w-full items-center gap-3">
                      <span className="flex w-5 shrink-0 items-center">
                        {reuseReactionMode === "lockdown" ? (
                          <BsCheckSquare
                            aria-hidden="true"
                            className="text-base"
                          />
                        ) : (
                          <BsSquare aria-hidden="true" className="text-base" />
                        )}
                      </span>
                      <span className="flex flex-col items-start gap-1.5">
                        <span className="font-semibold">Блокировка</span>
                        <span className="text-xs font-normal opacity-80">
                          Максимальные ограничения до ручного подтверждения.
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      );
    }

    if (safeActiveTab === "users") {
      const currentServerId = selectedServer
        ? resolveCatalogServerId(selectedServer)
        : null;
      const filteredServerUsers = serverUsers.filter((user) => {
        return isSearchMatch(user.fullname, debouncedUsersSearch);
      });
      const selectedUserSessions =
        currentServerId && selectedUser
          ? getSessionsForServerAndUser(currentServerId, selectedUser.id).sort(
              (left, right) => right.createdAt.localeCompare(left.createdAt),
            )
          : [];
      return (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <section className="card border border-base-300 bg-base-100">
            <div className="card-body p-3">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={() => setIsAddUserModalOpen(true)}
                >
                  Добавить пользователя
                </button>
              </div>
            </div>
          </section>
          <div className="flex min-h-0 flex-1 gap-4">
            <section className="card w-72 shrink-0 min-h-0 border border-base-300 bg-base-100 flex flex-col">
              <header className="flex items-center justify-between border-b border-base-300 px-3 py-2">
                <h4 className="card-title text-base">Пользователи</h4>
              </header>
              <div className="border-b border-base-300 px-3 py-2">
                <label className="input input-bordered input-sm flex items-center gap-2">
                  <input
                    className="grow"
                    type="text"
                    placeholder="Поиск"
                    value={usersSearch}
                    onChange={(event) => setUsersSearch(event.target.value)}
                  />
                  {usersSearchTrimmed ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      aria-label="Очистить поиск"
                      onClick={() => setUsersSearch("")}
                    >
                      X
                    </button>
                  ) : null}
                </label>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {filteredServerUsers.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-base-content/70">
                    Ничего не найдено
                  </p>
                ) : (
                  <ul className="menu gap-1 w-full">
                    {filteredServerUsers.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          className={
                            user.id === selectedUserId
                              ? "flex w-full items-center gap-2 bg-primary/20 text-primary font-semibold"
                              : "flex w-full items-center gap-2 text-base-content"
                          }
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <span
                            className={
                              user.isOnline
                                ? "h-2.5 w-2.5 shrink-0 rounded-full bg-success"
                                : "h-2.5 w-2.5 shrink-0 rounded-full bg-base-content/30"
                            }
                            aria-label={user.isOnline ? "В сети" : "Не в сети"}
                            title={user.isOnline ? "В сети" : "Не в сети"}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">
                              {user.fullname}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-base-content/70">
                              {formatUserPresenceSubtitle(
                                user.isOnline,
                                user.lastSeenAt,
                              )}
                            </span>
                          </span>
                          {shouldShowDesignerRoleBadge(user.role) ? (
                            <span className="badge badge-outline badge-primary badge-sm">
                              {normalizeRole(user.role) ?? "USER"}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div
              ref={usersDetailsColumnRef}
              className="min-h-0 min-w-0 flex-1 flex flex-col gap-4 overflow-y-auto"
            >
              {isRootUserHidden ? (
                <section className="card border border-base-300 bg-base-100">
                  <div className="card-body">
                    <p className="text-base-content/70">
                      Данные пользователя скрыты
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  <section className="card border border-base-300 bg-base-100">
                    <div className="p-4">
                      {!selectedUser ? (
                        <p className="text-base-content/70">
                          Пользователь не выбран
                        </p>
                      ) : (
                        <>
                          <h4 className="card-title text-base mb-4">Аккаунт</h4>
                          <form
                            id="settings-users-form"
                            className="grid gap-4 md:grid-cols-2"
                            onSubmit={onUserSave}
                          >
                            <label className="form-control w-full">
                              <span className="label">
                                <span className="label-text">Логин</span>
                              </span>
                              <input
                                className="input input-bordered w-full"
                                type="text"
                                value={userDraft.login}
                                onChange={(event) =>
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    login: event.target.value,
                                  }))
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
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    fullname: event.target.value,
                                  }))
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
                                type="password"
                                value={userDraft.password}
                                onChange={(event) =>
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    password: event.target.value,
                                  }))
                                }
                                disabled={
                                  !editability.canEdit || isSelectedCurrentUser
                                }
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
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    role: event.target.value,
                                  }))
                                }
                                disabled={!editability.canChangeRole}
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="USER">USER</option>
                                <option value="ROOT" disabled>
                                  ROOT
                                </option>
                              </select>
                            </label>

                            <label className="label justify-start gap-3">
                              <input
                                className="toggle toggle-error"
                                type="checkbox"
                                checked={userDraft.blocked}
                                onChange={(event) =>
                                  setUserDraft((prev) => ({
                                    ...prev,
                                    blocked: event.target.checked,
                                  }))
                                }
                                disabled={
                                  !editability.canEdit || isSelectedCurrentUser
                                }
                              />
                              <span className="text-error">Заблокирован</span>
                            </label>
                          </form>
                        </>
                      )}
                    </div>
                  </section>

                  {isSelectedCurrentUser ? (
                    <section className="card border border-base-300 bg-base-100">
                      <div className="card-body">
                        <h4 className="card-title text-base">Смена пароля</h4>
                        <div className="grid gap-4">
                          <label className="form-control w-full">
                            <span className="label">
                              <span className="label-text">Текущий пароль</span>
                            </span>
                            <input
                              className="input input-bordered w-full"
                              type="password"
                              value={userPasswordDraft.currentPassword}
                              onChange={(event) =>
                                setUserPasswordDraft((prev) => ({
                                  ...prev,
                                  currentPassword: event.target.value,
                                }))
                              }
                              disabled={!selectedServer}
                            />
                          </label>

                          <label className="form-control w-full">
                            <span className="label">
                              <span className="label-text">Новый пароль</span>
                            </span>
                            <input
                              className="input input-bordered w-full"
                              type="password"
                              value={userPasswordDraft.newPassword}
                              onChange={(event) =>
                                setUserPasswordDraft((prev) => ({
                                  ...prev,
                                  newPassword: event.target.value,
                                }))
                              }
                              disabled={!selectedServer}
                            />
                          </label>

                          <label className="form-control w-full">
                            <span className="label">
                              <span className="label-text">
                                Еще раз новый пароль
                              </span>
                            </span>
                            <input
                              className="input input-bordered w-full"
                              type="password"
                              value={userPasswordDraft.confirmNewPassword}
                              onChange={(event) =>
                                setUserPasswordDraft((prev) => ({
                                  ...prev,
                                  confirmNewPassword: event.target.value,
                                }))
                              }
                              disabled={!selectedServer}
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section className="card border border-base-300 bg-base-100">
                    <div className="card-body p-3">
                      {!selectedUser ? (
                        <p className="text-base-content/70">
                          Пользователь не выбран
                        </p>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="card-title text-base">Сессии</h4>
                          <button
                            type="button"
                            className="btn btn-soft btn-error btn-sm"
                            onClick={() => {
                              setSessionActionUserId(selectedUser.id);
                              setConfirmAction("remove-all-sessions");
                            }}
                            disabled={
                              selectedUserSessions.length === 0 ||
                              !canManageSelectedUserSessions
                            }
                          >
                            Завершить все сессии
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="card border border-base-300 bg-base-100">
                    <div className="p-4">
                      {!selectedUser ? (
                        <p className="text-base-content/70">
                          Пользователь не выбран
                        </p>
                      ) : (
                        <>
                          {!canManageSelectedUserSessions ? (
                            <p className="mb-2 text-sm text-warning">
                              ADMIN не может управлять сессиями пользователя
                              ROOT.
                            </p>
                          ) : null}
                          <div className="overflow-x-auto">
                            <table className="table table-zebra">
                              <thead>
                                <tr>
                                  <th>Сервер эммитер</th>
                                  <th>Клиент Тип</th>
                                  <th>Клиент адрес</th>
                                  <th>Активен</th>
                                  <th className="w-12" />
                                </tr>
                              </thead>
                              <tbody>
                                {selectedUserSessions.map((session) => {
                                  const clientType = sessionClientType(
                                    session.id,
                                  );
                                  const isCurrent = isCurrentSession(
                                    session,
                                    currentServerId,
                                  );
                                  const emitterDomain = selectedServer
                                    ? displayServerHost(
                                        selectedServer.serverUrl,
                                      )
                                    : "—";
                                  return (
                                    <tr key={session.id}>
                                      <td>{emitterDomain}</td>
                                      <td>
                                        <span
                                          className={
                                            clientType === "web"
                                              ? "badge badge-outline badge-primary"
                                              : "badge badge-outline badge-secondary"
                                          }
                                        >
                                          {clientType}
                                        </span>
                                      </td>
                                      <td>
                                        {clientType === "web"
                                          ? emitterDomain
                                          : "—"}
                                      </td>
                                      <td>
                                        {formatSessionLifetime(
                                          session.createdAt,
                                        )}
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className={
                                            isCurrent
                                              ? "btn btn-primary btn-xs"
                                              : "btn btn-error btn-xs"
                                          }
                                          aria-label={`Удалить сессию ${session.id}`}
                                          disabled={
                                            !canManageSelectedUserSessions
                                          }
                                          onClick={() => {
                                            setSessionToDelete(session.id);
                                            setSessionActionUserId(
                                              selectedUser.id,
                                            );
                                            setConfirmAction("remove-session");
                                          }}
                                        >
                                          X
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (safeActiveTab === "account") {
      return (
        <div className="space-y-4">
          {selectedServer?.user.role.trim().toUpperCase() === "ADMIN" ? (
            <section className="card border border-base-300 bg-base-100">
              <div className="card-body p-3">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={() => setConfirmAction("demote-admin")}
                  >
                    Перестать быть админом
                  </button>
                </div>
              </div>
            </section>
          ) : null}
          <form
            id="settings-account-form"
            className="space-y-4"
            onSubmit={onSaveAccount}
          >
            <section className="card border border-base-300 bg-base-100">
              <div className="card-body">
                <h4 className="card-title text-base">Профиль</h4>
                <div className="grid gap-4">
                  <label className="form-control w-full">
                    <span className="label">
                      <span className="label-text">Логин</span>
                    </span>
                    <input
                      className="input input-bordered w-full"
                      type="text"
                      value={accountDraft.login}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          login: event.target.value,
                        }))
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
                        setAccountDraft((prev) => ({
                          ...prev,
                          fullname: event.target.value,
                        }))
                      }
                      disabled={!selectedServer}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="card border border-base-300 bg-base-100">
              <div className="card-body">
                <h4 className="card-title text-base">Смена пароля</h4>
                <div className="grid gap-4">
                  <label className="form-control w-full">
                    <span className="label">
                      <span className="label-text">Текущий пароль</span>
                    </span>
                    <input
                      className="input input-bordered w-full"
                      type="password"
                      value={accountDraft.currentPassword}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
                      }
                      disabled={!selectedServer}
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="label">
                      <span className="label-text">Новый пароль</span>
                    </span>
                    <input
                      className="input input-bordered w-full"
                      type="password"
                      value={accountDraft.newPassword}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          newPassword: event.target.value,
                        }))
                      }
                      disabled={!selectedServer}
                    />
                  </label>

                  <label className="form-control w-full">
                    <span className="label">
                      <span className="label-text">Еще раз новый пароль</span>
                    </span>
                    <input
                      className="input input-bordered w-full"
                      type="password"
                      value={accountDraft.confirmNewPassword}
                      onChange={(event) =>
                        setAccountDraft((prev) => ({
                          ...prev,
                          confirmNewPassword: event.target.value,
                        }))
                      }
                      disabled={!selectedServer}
                    />
                  </label>
                </div>
              </div>
            </section>
          </form>
        </div>
      );
    }

    if (safeActiveTab === "sessions") {
      const currentServerId = selectedServer
        ? resolveCatalogServerId(selectedServer)
        : null;
      const emitterDomain = selectedServer
        ? displayServerHost(selectedServer.serverUrl)
        : "—";
      const currentUserId = selectedServer?.user.id ?? null;
      const sessionsSorted =
        currentServerId && currentUserId
          ? getSessionsForServerAndUser(currentServerId, currentUserId).sort(
              (left, right) => right.createdAt.localeCompare(left.createdAt),
            )
          : [];
      return (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <section className="card border border-base-300 bg-base-100 p-4">
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-soft btn-error btn-sm"
                onClick={() => {
                  setSessionActionUserId(currentUserId);
                  setConfirmAction("remove-current-session");
                }}
                disabled={!currentServerId}
              >
                Завершить текущую сессию
              </button>
              <button
                type="button"
                className="btn btn-soft btn-error btn-sm"
                onClick={() => {
                  setSessionActionUserId(currentUserId);
                  setConfirmAction("remove-all-sessions");
                }}
                disabled={sessionsSorted.length === 0}
              >
                Завершить все сессии
              </button>
              <button
                type="button"
                className="btn btn-soft btn-error btn-sm"
                onClick={() => {
                  setSessionActionUserId(currentUserId);
                  setConfirmAction("remove-all-except-current");
                }}
                disabled={!currentServerId}
              >
                Завершить все, кроме текущей
              </button>
            </div>
          </section>

          <section className="card min-h-0 flex-1 border border-base-300 bg-base-100">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Родительский сервер</th>
                      <th>Тип</th>
                      <th>Клиент</th>
                      <th>Активен</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsSorted.map((session) => {
                      const isCurrent = isCurrentSession(
                        session,
                        currentServerId,
                      );
                      const clientType = sessionClientType(session.id);
                      return (
                        <tr key={session.id}>
                          <td>{emitterDomain}</td>
                          <td>
                            <span
                              className={
                                clientType === "web"
                                  ? "badge badge-outline badge-primary"
                                  : "badge badge-outline badge-secondary"
                              }
                            >
                              {clientType}
                            </span>
                          </td>
                          <td>
                            {clientType === "web" ? emitterDomain : "android"}
                          </td>
                          <td>{formatSessionLifetime(session.createdAt)}</td>
                          <td>
                            <button
                              type="button"
                              className={
                                isCurrent
                                  ? "btn btn-primary btn-xs"
                                  : "btn btn-error btn-xs"
                              }
                              aria-label={`Удалить сессию ${session.id}`}
                              onClick={() => {
                                setSessionToDelete(session.id);
                                setSessionActionUserId(currentUserId);
                                setConfirmAction("remove-session");
                              }}
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-base-200"
      role="dialog"
      aria-modal="true"
      aria-label="Настройки"
    >
      <section className="flex h-full w-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-400 bg-base-300 p-4">
          <div className="min-w-0 relative z-40">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-base-content">
              <span className="shrink-0">Настройка</span>
              <div className="dropdown">
                <button
                  type="button"
                  tabIndex={0}
                  ref={settingsServerDropdownTriggerRef}
                  className="btn btn-sm btn-outline min-w-0 max-w-xs justify-between"
                  aria-label="Выбор сервера для настроек"
                >
                  <span className="truncate">{settingsServerLabel}</span>
                  <span className="ml-2 text-xs opacity-70">v</span>
                </button>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu z-30 mt-1 w-96 divide-y divide-gray-600 rounded-box border border-base-300 bg-base-100 p-1 shadow"
                >
                  {serversList.length === 0 ? (
                    <li>
                      <span className="text-sm text-base-content/70">
                        Серверы не найдены
                      </span>
                    </li>
                  ) : (
                    serversList.map((server) => {
                      const serverLabel =
                        server.name?.trim() || displayServerHost(server.serverUrl);
                      const isSelected = server.serverUrl === selectedServer?.serverUrl;
                      const role = normalizeRole(server.user.role);
                      const hasPrivilegedBadge =
                        role === "ADMIN" || role === "ROOT";
                      return (
                        <li key={server.serverUrl} className="w-full">
                          <button
                            type="button"
                            className={
                              isSelected
                                ? "active bg-primary text-primary-content flex! w-full! items-start! justify-start! px-4 py-3"
                                : "flex! w-full! items-start! justify-start! px-4 py-3"
                            }
                            onClick={(event) => {
                              setSettingsServerUrl(server.serverUrl);
                              event.currentTarget.blur();
                              settingsServerDropdownTriggerRef.current?.blur();
                            }}
                          >
                            <span className="flex w-full min-w-0 flex-col items-start gap-1">
                              <span className="min-w-0 truncate text-base font-bold leading-tight">
                                {serverLabel}
                              </span>
                              <span className="min-w-0 truncate text-xs text-base-content/70">
                                {displayServerHost(server.serverUrl)}
                              </span>
                              <span className="mt-2 flex w-full items-center justify-between gap-2 text-sm text-base-content/80">
                                <span className="min-w-0 truncate">
                                  {server.user.fullname}
                                </span>
                                {hasPrivilegedBadge ? (
                                  <span className="badge badge-outline badge-xs uppercase">
                                    {role?.toLowerCase()}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
              <span className="shrink-0">сервера</span>
            </h2>
            {settingsServerHost && (
              <p className="truncate text-xs text-base-content/70">
                {settingsServerHost}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            aria-label="Закрыть настройки"
            onClick={() => setIsOpen(false)}
          >
            X
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav className="min-h-0 w-56 shrink-0 overflow-y-auto border-r border-gray-400 bg-base-300 p-4">
            <ul className="menu gap-1 w-full">
              {availableTabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={
                      tab.id === safeActiveTab
                        ? "bg-primary/20 text-primary"
                        : "text-base-content"
                    }
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="flex w-full items-center gap-3 px-0 py-0 text-base">
                      {tabIcon(tab.id)}
                      {tab.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex min-h-0 flex-1 flex-col bg-base-200">
            <div
              className={
                usersTabLayout
                  ? "min-h-0 flex-1 overflow-hidden p-4"
                  : "min-h-0 flex-1 overflow-y-auto p-4"
              }
            >
              {renderTabContent()}
            </div>
            {saveFormId ? (
              <footer className="shrink-0 border-t border-gray-400 bg-base-200 p-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saveDisabled}
                    onClick={onRequestSave}
                  >
                    Сохранить
                  </button>
                </div>
              </footer>
            ) : null}
          </div>
        </div>
      </section>

      {isAddUserModalOpen ? (
        <div className="modal modal-open" role="dialog">
          <section className="modal-box w-full max-w-md">
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
                    setAddUserDraft((prev) => ({
                      ...prev,
                      login: event.target.value,
                    }))
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
                    setAddUserDraft((prev) => ({
                      ...prev,
                      fullname: event.target.value,
                    }))
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
                    type="password"
                    value={addUserDraft.password}
                    onChange={(event) =>
                      setAddUserDraft((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
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
          <button
            type="button"
            className="modal-backdrop bg-black/50"
            aria-label="Закрыть"
            onClick={() => {
              setIsAddUserModalOpen(false);
              setAddUserError(null);
              setAddUserDraft({ login: "", fullname: "", password: "" });
            }}
          />
        </div>
      ) : null}

      {confirmAction ? (
        <div className="modal modal-open" role="dialog">
          <section className="modal-box w-full max-w-md">
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
                  setSessionActionUserId(null);
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
          <button
            type="button"
            className="modal-backdrop bg-black/50"
            aria-label="Закрыть"
            onClick={() => {
              setConfirmAction(null);
              setSessionToDelete(null);
              setSessionActionUserId(null);
            }}
          />
        </div>
      ) : null}
      {saveConfirmOpen ? (
        <div className="modal modal-open" role="dialog">
          <section className="modal-box w-full max-w-md">
            <h4 className="text-lg font-semibold">Подтверждение сохранения</h4>
            <p className="mt-3 text-base-content/80">
              Сохранить изменения в разделе "{titleForTab(safeActiveTab)}"?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSaveConfirmOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirmSave}
              >
                Подтвердить
              </button>
            </div>
          </section>
          <button
            type="button"
            className="modal-backdrop bg-black/50"
            aria-label="Закрыть"
            onClick={() => setSaveConfirmOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
