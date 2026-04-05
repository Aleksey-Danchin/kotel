import clsx from "clsx";
import { GiNetworkBars } from "react-icons/gi";
import { IoCloudOfflineOutline } from "react-icons/io5";
import {
  normalizeDesignerRole,
  shouldShowDesignerRoleBadge,
} from "../state/roles";
import type { ServerSession } from "../state/servers";

function displayServerHost(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname;
  } catch {
    return serverUrl;
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveServerPingStatus(serverUrl: string): {
  isConnected: boolean;
  pingMs: number;
  lastPingMs: number;
} {
  // Ensure designer list always demonstrates all link quality states.
  const presetByUrl: Record<
    string,
    { isConnected: boolean; pingMs: number; lastPingMs: number }
  > = {
    "https://kotel-main.localhost": {
      isConnected: true,
      pingMs: 58,
      lastPingMs: 61,
    }, // good
    "https://kotel-eu.localhost": {
      isConnected: true,
      pingMs: 180,
      lastPingMs: 176,
    }, // medium
    "https://kotel-ru.localhost": {
      isConnected: true,
      pingMs: 640,
      lastPingMs: 622,
    }, // bad
    "http://localhost:5173": {
      isConnected: true,
      pingMs: 1240,
      lastPingMs: 1210,
    }, // very_bad
    "https://no-chats.localhost": {
      isConnected: false,
      pingMs: 0,
      lastPingMs: 290,
    }, // disconnect
  };
  const preset = presetByUrl[serverUrl];
  if (preset) {
    return preset;
  }

  const seed = hashString(serverUrl);
  const pingMs = 40 + (seed % 180);
  const lastPingMs = 60 + ((seed * 3) % 220);
  const isConnected = seed % 7 !== 0;
  return { isConnected, pingMs, lastPingMs };
}

type PingQuality = "good" | "medium" | "bad" | "very_bad";

function resolvePingQuality(pingMs: number): PingQuality {
  if (pingMs < 100) return "good";
  if (pingMs < 300) return "medium";
  if (pingMs < 1000) return "bad";
  return "very_bad";
}

export function serverCardTitle(state: ServerSession): string {
  if (typeof state.name === "string" && state.name.trim()) {
    return state.name.trim();
  }
  return displayServerHost(state.serverUrl);
}

export interface ServerCardProps {
  state: ServerSession;
  active: boolean;
  /** Непрочитанные по всем каналам этого сервера (мок-данные). */
  unreadCount?: number;
  className?: string;

  /** Выбор строки (основная кликабельная область карточки). */
  onSelect: () => void;
}

export function ServerCard({
  state,
  active,
  unreadCount = 0,
  className,
  onSelect,
}: ServerCardProps) {
  const title = serverCardTitle(state);
  const host = displayServerHost(state.serverUrl);
  const showUnread = unreadCount > 0;
  const normalizedRole = normalizeDesignerRole(state.user.role);
  const showRoleBadge = shouldShowDesignerRoleBadge(state.user.role);
  const pingStatus = resolveServerPingStatus(state.serverUrl);
  const pingQuality = resolvePingQuality(pingStatus.pingMs);
  const pingColorClass = pingStatus.isConnected
    ? pingQuality === "good"
      ? "text-success"
      : pingQuality === "medium"
        ? "text-warning"
        : pingQuality === "bad"
          ? "text-orange-500"
          : "text-error"
    : "text-error";

  return (
    <div
      className={clsx(
        "relative w-full border p-3 text-left transition cursor-pointer",
        active
          ? "border-primary/50 bg-primary/10"
          : "border-base-300 bg-base-200",
        className,
      )}
      onClick={onSelect}
    >
      <div className="flex w-full min-w-0 flex-col items-start text-left">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{title}</div>
            <div className="truncate text-xs text-base-content/70">{host}</div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 text-xs">
            <span
              className={clsx(
                "flex items-center gap-1 tabular-nums",
                pingColorClass,
              )}
            >
              {pingStatus.isConnected ? (
                <GiNetworkBars className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <IoCloudOfflineOutline
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span className="text-right">
                {pingStatus.isConnected ? pingStatus.pingMs : 0} ms
              </span>
            </span>
            {showUnread ? (
              <span
                className="badge badge-primary badge-sm h-5 justify-center px-1 font-semibold tabular-nums"
                aria-label={`Непрочитанных сообщений на сервере: ${unreadCount}`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex w-full items-center justify-between gap-2">
          <div className="truncate text-sm text-base-content">
            {state.user.fullname}
          </div>
          {showRoleBadge ? (
            <span className="badge badge-outline badge-xs shrink-0">
              {normalizedRole}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
