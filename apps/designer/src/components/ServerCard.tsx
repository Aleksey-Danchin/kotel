import clsx from "clsx";
import { normalizeDesignerRole, shouldShowDesignerRoleBadge } from "../state/roles";
import type { ServerSession } from "../state/servers";

function displayServerHost(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname;
  } catch {
    return serverUrl;
  }
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
  onDelete: () => void;
}

export function ServerCard({
  state,
  active,
  unreadCount = 0,
  className,
  onSelect,
  onDelete,
}: ServerCardProps) {
  const title = serverCardTitle(state);
  const host = displayServerHost(state.serverUrl);
  const disconnectLabel = `Отключить ${host}`;
  const showUnread = unreadCount > 0;
  const normalizedRole = normalizeDesignerRole(state.user.role);
  const showRoleBadge = shouldShowDesignerRoleBadge(state.user.role);

  return (
    <div
      className={clsx(
        "relative flex items-start gap-2",
        "w-full border p-2 text-left transition cursor-pointer",
        active
          ? "border-primary/50 bg-primary/10"
          : "border-base-300 bg-base-200",
        className,
      )}
    >
      <div
        className={clsx(
          "flex-1 flex-col items-start text-left",
          showUnread && "mt-4",
        )}
        onClick={onSelect}
      >
        <div className="flex flex-row justify-between">
          <div className="font-medium">{title}</div>

          {showUnread && (
            <span
              className="badge badge-primary badge-sm px-1.5 font-semibold tabular-nums"
              aria-label={`Непрочитанных сообщений на сервере: ${unreadCount}`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        <div className="text-xs text-base-content/70">
          {state.user.fullname}
        </div>

        {showRoleBadge ? (
          <div>
            <span className="mt-1 badge badge-outline badge-sm">{normalizedRole}</span>
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-ghost btn-xs shrink-0 text-error"
          onClick={onDelete}
          aria-label={disconnectLabel}
        >
          Отключить
        </button>
      </div>
    </div>
  );
}
