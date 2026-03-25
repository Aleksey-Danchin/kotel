import clsx from "clsx";
import type { ChatPreview } from "../state/store";

export interface ChatCardProps {
  chat: ChatPreview;
  active: boolean;
  onSelect: () => void;
}

export function ChatCard({ chat, active, onSelect }: ChatCardProps) {
  return (
    <div
      className={clsx(
        "w-full border p-3 text-left transition cursor-pointer",
        active
          ? "border-primary/50 bg-primary/10"
          : "border-base-300 bg-base-200",
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">{chat.title}</div>
        {chat.unread > 0 && (
          <span className="badge badge-primary badge-sm">{chat.unread}</span>
        )}
      </div>
      <div className="mt-1 text-xs text-base-content/70">{chat.subtitle}</div>
    </div>
  );
}
