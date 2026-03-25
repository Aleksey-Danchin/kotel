import { useRef, useState, type SubmitEventHandler } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import {
  serversAtom,
  setServerSession,
  removeServerSession,
  type ServerSession,
} from "../state/servers";
import { activeServerIdAtom } from "../state/selectionAtoms";
import {
  getTotalUnreadForServerSession,
  selectedServerAtom,
} from "../state/store";
import { ServerCard } from "../components/ServerCard";
import { serverRouteIdFromServerUrl } from "../state/serverRouteId";

function displayServerHost(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname;
  } catch {
    return serverUrl;
  }
}

/** Адрес без схемы (kotel.localhost, 127.0.0.1:8081) приводится к URL с https. */
function normalizeServerAddressInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Введите адрес сервера");
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname) {
      throw new Error("Укажите имя хоста или IP");
    }
    return parsed.toString();
  } catch {
    throw new Error("Неверный адрес сервера");
  }
}

export function ServicesColumn() {
  const navigate = useNavigate();
  const serversMap = useAtomValue(serversAtom);
  const selectedServer = useAtomValue(selectedServerAtom);
  const setActiveServerId = useSetAtom(activeServerIdAtom);
  const servers = Array.from(serversMap.values());
  const [newServerUrl, setNewServerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addServerDialogRef = useRef<HTMLDialogElement>(null);

  const onAddServer: SubmitEventHandler<HTMLFormElement> = async (event) => {
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
      const normalized = normalizeServerAddressInput(serverUrl);

      const host = displayServerHost(normalized);
      const nextSession: ServerSession = {
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
          role: "designer",
        },
      };

      setServerSession(nextSession);
      const rid = serverRouteIdFromServerUrl(normalized);
      setActiveServerId(rid);
      navigate({ to: "/$id", params: { id: rid } });
      setNewServerUrl("");
      addServerDialogRef.current?.close();
    } catch (addError) {
      const message =
        addError instanceof Error
          ? addError.message
          : "Не удалось добавить сервер";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  function onDisconnect(serverUrl: string) {
    setError(null);
    removeServerSession(serverUrl);
  }

  return (
    <aside className="flex h-full min-h-screen w-full flex-col border-r border-base-200 bg-base-300 p-1">
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {servers.map((session) => {
          const isActive =
            selectedServer != null &&
            session.serverUrl === selectedServer.serverUrl;

          return (
            <ServerCard
              key={session.serverUrl}
              state={session}
              active={isActive}
              unreadCount={getTotalUnreadForServerSession(session)}
              onSelect={() => {
                const rid = serverRouteIdFromServerUrl(session.serverUrl);
                setActiveServerId(rid);
                navigate({ to: "/$id", params: { id: rid } });
              }}
              onDelete={() => onDisconnect(session.serverUrl)}
            />
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-outline mt-4 w-full shrink-0"
        onClick={() => {
          setError(null);
          addServerDialogRef.current?.showModal();
        }}
      >
        Добавить сервер
      </button>

      <dialog
        ref={addServerDialogRef}
        className="modal"
        onClose={() => {
          setNewServerUrl("");
          setError(null);
        }}
      >
        <div className="modal-box max-w-md">
          <h2 className="text-lg font-semibold text-base-content">
            Добавить сервер
          </h2>
          <p className="mt-1 text-sm text-base-content/70">
            Хост, IP:порт или полный URL — для песочницы без реального
            подключения.
          </p>

          <form className="mt-4 flex flex-col gap-3" onSubmit={onAddServer}>
            <label className="form-control w-full" htmlFor="add-server-input">
              <span className="label">
                <span className="label-text font-medium">Адрес сервера</span>
              </span>
              <input
                id="add-server-input"
                className="input input-bordered w-full"
                type="text"
                placeholder="kotel.localhost"
                inputMode="url"
                autoComplete="off"
                value={newServerUrl}
                onChange={(event) => setNewServerUrl(event.target.value)}
                disabled={isSubmitting}
              />
            </label>

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <div className="modal-action mt-2 flex-row gap-2">
              <button
                type="button"
                className="btn"
                disabled={isSubmitting}
                onClick={() => addServerDialogRef.current?.close()}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Подключение..." : "Добавить"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Закрыть" />
        </form>
      </dialog>
    </aside>
  );
}
