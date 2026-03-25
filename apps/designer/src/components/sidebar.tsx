import { useState, type FormEvent } from "react";
import { useAtomValue } from "jotai";
import {
  activeServerUrlAtom,
  serversAtom,
  serversStore,
  setActiveServer,
  setServerSession,
  removeServerSession,
  type ServerSession,
} from "../state/servers";

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
  const servers = Array.from(serversMap.values());
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

    // Песочница: без сетевых запросов. Имитация “подключения” только для UI.
    try {
      let normalized = serverUrl;
      try {
        normalized = new URL(serverUrl).toString();
      } catch {
        throw new Error("Неверный URL сервера");
      }

      const host = displayServerHost(normalized);
      const nextSession: ServerSession = {
        serverUrl: normalized,
        user: {
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `mock-${host}`,
          fullname: `User @ ${host}`,
          login: host.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase().slice(0, 24) || "user",
          role: "designer",
        },
      };

      setServerSession(nextSession);
      setActiveServer(normalized);
      setNewServerUrl("");
    } catch (addError) {
      const message =
        addError instanceof Error ? addError.message : "Не удалось добавить сервер";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function onDisconnect(serverUrl: string) {
    setError(null);
    removeServerSession(serverUrl);
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
                    onClick={() => onDisconnect(session.serverUrl)}
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
