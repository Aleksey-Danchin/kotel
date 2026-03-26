import clsx from "clsx";
import type { MockUser } from "../state/store";

export interface UserCardProps {
  user: MockUser;
  onSelect: () => void;
}

function formatLastSeen(lastSeenAt: string): string {
  const parsed = new Date(lastSeenAt);
  if (Number.isNaN(parsed.getTime())) return "Неизвестно";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <button
      type="button"
      className="w-full border border-base-300 bg-base-200 p-3 text-left transition hover:bg-base-100"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">{user.fullname}</div>
        <span
          className={clsx("h-2.5 w-2.5 rounded-full", {
            "bg-success": user.isOnline,
            "bg-base-content/30": !user.isOnline,
          })}
          aria-label={user.isOnline ? "В сети" : "Не в сети"}
          title={user.isOnline ? "В сети" : "Не в сети"}
        />
      </div>
      <div className="mt-1 text-xs text-base-content/70">
        Был(а) в сети: {formatLastSeen(user.lastSeenAt)}
      </div>
    </button>
  );
}
