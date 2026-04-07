import clsx from "clsx";
import type { ReactNode } from "react";

export interface ChatFeedCardBaseProps {
  title: string;
  subtitle: string;
  leading: ReactNode;
  unread?: number;
  active?: boolean;
  onSelect: () => void;
}

export function ChatFeedCardBase({
  title,
  subtitle,
  leading,
  unread = 0,
  active = false,
  onSelect,
}: ChatFeedCardBaseProps) {
  return (
    <button
      type="button"
      className={clsx(
        "w-full border p-3 text-left transition",
        active
          ? "border-primary/50 bg-primary/10"
          : "border-base-300 bg-base-200 hover:bg-base-100",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <div className="truncate font-medium">{title}</div>
        </div>
        {unread > 0 ? (
          <span
            className="badge badge-primary badge-sm h-5 justify-center px-1 font-semibold tabular-nums"
            aria-label={`Непрочитанных сообщений: ${unread}`}
          >
            {unread}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-base-content/70">{subtitle}</div>
    </button>
  );
}
