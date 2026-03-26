import clsx from "clsx";
import type { MockUser } from "../state/store";
import { formatUserPresenceSubtitle } from "../state/userPresence";

export interface UserCardProps {
  user: MockUser;
  onSelect: () => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  const statusText = formatUserPresenceSubtitle(user.isOnline, user.lastSeenAt);

  return (
    <button
      type="button"
      className="w-full border border-base-300 bg-base-200 p-3 text-left transition hover:bg-base-100"
      onClick={onSelect}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 items-center gap-2 font-medium">
          <span
            className={clsx("h-2.5 w-2.5 rounded-full", {
              "bg-success": user.isOnline,
              "bg-base-content/30": !user.isOnline,
            })}
            aria-label={user.isOnline ? "В сети" : "Не в сети"}
            title={user.isOnline ? "В сети" : "Не в сети"}
          />
          <span className="truncate">{user.fullname}</span>
        </div>
      </div>
      <div className="mt-1 text-xs text-base-content/70">{statusText}</div>
    </button>
  );
}
