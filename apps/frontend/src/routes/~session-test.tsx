import { useAtomValue } from "jotai";
import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addServer } from "../api/auth";
import { getServerClient } from "../api/create-server-client";
import { logout } from "../api/logout";
import { serversAtom, serversStore } from "../state/servers";

interface SessionStatusResponse {
  sessionId: string;
  user: {
    id: string;
    fullname: string;
    login: string;
    role: string;
  };
}

export const Route = createFileRoute("/session-test")({
  component: SessionTestPage,
});

function SessionTestPage() {
  const serversMap = useAtomValue(serversAtom, { store: serversStore });
  const servers = useMemo(() => Array.from(serversMap.values()), [serversMap]);
  const [serverUrl, setServerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusByServer, setStatusByServer] = useState<
    Record<string, SessionStatusResponse | null>
  >({});

  async function onAddServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUrl = serverUrl.trim();
    if (!normalizedUrl) {
      setError("Введите адрес сервера");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addServer(normalizedUrl);
      setServerUrl("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Не удалось добавить сервер");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onCheckStatus(url: string) {
    setError(null);
    try {
      const client = getServerClient(url);
      const response = await client.get<SessionStatusResponse>("/api/session/status");
      setStatusByServer((current) => ({ ...current, [url]: response.data }));
    } catch (statusError) {
      setError(
        statusError instanceof Error ? statusError.message : "Не удалось проверить статус",
      );
    }
  }

  async function onForceRefresh(url: string) {
    setError(null);
    try {
      const client = getServerClient(url);
      await client.post("/api/session/refresh");
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Не удалось принудительно обновить сессию",
      );
    }
  }

  async function onLogout(url: string, allDevices: boolean) {
    setError(null);
    try {
      await logout(url, allDevices);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Не удалось выйти");
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Session test</h1>
        <p className="text-sm text-base-content/80">
          Страница ручного тестирования OAuth и управления сессиями.
        </p>
      </header>

      <form className="card bg-base-200 shadow-sm" onSubmit={onAddServer}>
        <div className="card-body gap-3">
          <h2 className="card-title text-base">Добавить сервер</h2>
          <input
            className="input input-bordered w-full"
            placeholder="https://kotel.localhost"
            type="url"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            disabled={isSubmitting}
          />
          <div className="card-actions justify-end">
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Подключение..." : "Add server"}
            </button>
          </div>
        </div>
      </form>

      {error ? <p className="alert alert-error">{error}</p> : null}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Подключенные серверы</h2>
        {servers.length === 0 ? (
          <div className="alert">Серверы не подключены.</div>
        ) : (
          <ul className="space-y-3">
            {servers.map((session) => {
              const status = statusByServer[session.serverUrl];
              return (
                <li key={session.serverUrl} className="card bg-base-200 shadow-sm">
                  <div className="card-body gap-3">
                    <div>
                      <p className="font-medium">{session.serverUrl}</p>
                      <p className="text-sm text-base-content/80">
                        {session.user.fullname} ({session.user.login}) - {session.user.role}
                      </p>
                      {status ? (
                        <p className="text-xs text-base-content/70">
                          sessionId: {status.sessionId}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => void onCheckStatus(session.serverUrl)}
                      >
                        Check status
                      </button>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={() => void onLogout(session.serverUrl, false)}
                      >
                        Logout
                      </button>
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() => void onLogout(session.serverUrl, true)}
                      >
                        Logout all devices
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void onForceRefresh(session.serverUrl)}
                      >
                        Force refresh
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <section className="card bg-base-200 shadow-sm">
        <div className="card-body gap-2">
          <h2 className="card-title text-base">Raw state</h2>
          <pre className="max-h-80 overflow-auto rounded-lg bg-base-300 p-3 text-xs">
            {JSON.stringify(Array.from(serversMap.entries()), null, 2)}
          </pre>
        </div>
      </section>
    </section>
  );
}
