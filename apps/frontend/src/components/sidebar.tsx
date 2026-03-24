import { useMemo, useState, type FormEvent } from "react";
import { useAtomValue } from "jotai";
import {
  activeServerUrlAtom,
  serversAtom,
  serversStore,
  setActiveServer,
} from "../state/servers";
import { addServer } from "../api/auth";
import { logout } from "../api/logout";

function displayServerHost(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname;
  } catch {
    return serverUrl;
  }
}

export function Sidebar() {
  const serversMap = useAtomValue(serversAtom, { store: serversStore });
  const activeServerUrl = useAtomValue(activeServerUrlAtom, { store: serversStore });
  const servers = useMemo(() => Array.from(serversMap.values()), [serversMap]);
  const [newServerUrl, setNewServerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasServers = servers.length > 0;

  async function onAddServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const serverUrl = newServerUrl.trim();
    if (!serverUrl) {
      setError("Введите адрес сервера");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addServer(serverUrl);
      setNewServerUrl("");
    } catch (addError) {
      const message =
        addError instanceof Error ? addError.message : "Не удалось добавить сервер";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDisconnect(serverUrl: string) {
    setError(null);
    try {
      await logout(serverUrl, false);
    } catch (disconnectError) {
      const message =
        disconnectError instanceof Error
          ? disconnectError.message
          : "Не удалось отключить сервер";
      setError(message);
    }
  }

  return (
    <aside className="w-80 min-h-screen border-r border-base-300 bg-base-200 p-4">
      <h2 className="text-lg font-semibold">Серверы</h2>

      {!hasServers ? (
        <div className="mt-6 rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-sm text-base-content/80">
          Нет подключенных серверов. Добавьте первый сервер ниже.
        </div>
      ) : (
        <ul className="menu mt-4 w-full rounded-box bg-base-100">
          {servers.map((session) => {
            const isActive = session.serverUrl === activeServerUrl;
            return (
              <li key={session.serverUrl} className="mb-1">
                <div
                  className={`flex items-start gap-2 rounded-box p-2 ${
                    isActive ? "bg-primary/15" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setActiveServer(session.serverUrl)}
                  >
                    <div className="font-medium">{displayServerHost(session.serverUrl)}</div>
                    <div className="text-xs text-base-content/70">{session.user.fullname}</div>
                    <span className="badge badge-outline badge-sm mt-1">
                      {session.user.role.toUpperCase()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => void onDisconnect(session.serverUrl)}
                    aria-label={`Отключить ${displayServerHost(session.serverUrl)}`}
                  >
                    Отключить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="mt-6 space-y-2" onSubmit={onAddServer}>
        <label className="label p-0" htmlFor="add-server-input">
          <span className="label-text font-medium">Добавить сервер</span>
        </label>
        <input
          id="add-server-input"
          className="input input-bordered w-full"
          type="url"
          placeholder="https://kotel.localhost"
          value={newServerUrl}
          onChange={(event) => setNewServerUrl(event.target.value)}
          disabled={isSubmitting}
        />
        <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Подключение..." : "Добавить сервер"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
    </aside>
  );
}
