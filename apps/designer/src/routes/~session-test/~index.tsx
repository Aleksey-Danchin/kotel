import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import {
  serversAtom,
  setServerSession,
  removeServerSession,
} from "../../state/servers";
import { normalizeDesignerRole } from "../../state/roles";
import { activeServerIdAtom } from "../../state/selectionAtoms";
import { serverRouteIdFromServerUrl } from "../../state/serverRouteId";

export const Route = createFileRoute("/session-test/")({
  component: SessionTestPage,
});

function SessionTestPage() {
  const navigate = useNavigate();
  const [banner, setBanner] = useState<string | null>(null);
  const serversMap = useAtomValue(serversAtom);
  const servers = Array.from(serversMap.values());
  const setActiveServerId = useSetAtom(activeServerIdAtom);
  const [newServerUrl, setNewServerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusByServer, setStatusByServer] = useState<
    Record<string, { sessionId: string }>
  >({});

  function displayServerHost(serverUrl: string): string {
    try {
      return new URL(serverUrl).hostname;
    } catch {
      return serverUrl;
    }
  }

  async function onAddServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawUrl = newServerUrl.trim();
    if (!rawUrl) {
      setBanner("Введите URL сервера");
      return;
    }

    setIsSubmitting(true);
    setBanner(null);
    try {
      let normalized = rawUrl;
      normalized = new URL(rawUrl).toString();

      const host = displayServerHost(normalized);
      // Моки данных создаём только внутри тела компонента/обработчиков.
      setServerSession({
        serverUrl: normalized,
        user: {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `mock-${host}`,
          fullname: `User @ ${host}`,
          login:
            host
              .replace(/[^a-zA-Z0-9]+/g, "_")
              .toLowerCase()
              .slice(0, 24) || "user",
          role: "USER",
        },
      });
      const rid = serverRouteIdFromServerUrl(normalized);
      setActiveServerId(rid);
      void navigate({ to: "/$id", params: { id: rid } });

      setNewServerUrl("");
      setBanner(`(mock) Сервер добавлен: ${host}`);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Неверный URL");
    } finally {
      setIsSubmitting(false);
    }
  }

  function onCheckStatus(url: string) {
    const host = displayServerHost(url);
    const sessionId = `sess_${host.replace(/[^a-zA-Z0-9]+/g, "_")}_${Date.now()}`;
    setStatusByServer((cur) => ({ ...cur, [url]: { sessionId } }));
    setBanner(`(mock) status ok: ${host}`);
  }

  function onLogout(url: string, allDevices: boolean) {
    removeServerSession(url);
    setStatusByServer((cur) => {
      const next = { ...cur };
      delete next[url];
      return next;
    });
    setBanner(
      `(mock) logout${allDevices ? " all devices" : ""}: ${displayServerHost(url)}`,
    );
  }

  function onForceRefresh(url: string) {
    const host = displayServerHost(url);
    const sessionId = `sess_refreshed_${host.replace(/[^a-zA-Z0-9]+/g, "_")}_${Date.now()}`;
    setStatusByServer((cur) => ({ ...cur, [url]: { sessionId } }));
    setBanner(`(mock) refresh: ${host}`);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Session test</h1>
        <p className="text-sm text-base-content/80">
          Песочница для верстки: кнопки имитируют логику, но не ходят в backend.
        </p>
      </header>

      {banner ? <p className="alert alert-info">{banner}</p> : null}

      <div className="space-y-4">
        <form className="card bg-base-200 shadow-sm" onSubmit={onAddServer}>
          <div className="card-body gap-3">
            <h2 className="card-title text-base">Добавить сервер (mock)</h2>
            <input
              className="input input-bordered w-full"
              placeholder="https://kotel.localhost"
              type="url"
              value={newServerUrl}
              onChange={(event) => setNewServerUrl(event.target.value)}
              disabled={isSubmitting}
            />
            <div className="card-actions justify-end">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Добавляем..." : "Add server"}
              </button>
            </div>
          </div>
        </form>

        <h2 className="text-lg font-semibold">Подключенные серверы</h2>
        {servers.length === 0 ? (
          <div className="alert">Серверы не подключены.</div>
        ) : (
          <ul className="space-y-3">
            {servers.map((session) => {
              const status = statusByServer[session.serverUrl];
              return (
                <li
                  key={session.serverUrl}
                  className="card bg-base-200 shadow-sm"
                >
                  <div className="card-body gap-3">
                    <div>
                      <p className="font-medium">{session.serverUrl}</p>
                      <p className="text-sm text-base-content/80">
                        {session.user.fullname} ({session.user.login}) -{" "}
                        {normalizeDesignerRole(session.user.role)}
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
                        onClick={() => onCheckStatus(session.serverUrl)}
                      >
                        Check status
                      </button>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={() => onLogout(session.serverUrl, false)}
                      >
                        Logout
                      </button>
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() => onLogout(session.serverUrl, true)}
                      >
                        Logout all devices
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onForceRefresh(session.serverUrl)}
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
