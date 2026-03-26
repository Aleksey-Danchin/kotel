import clsx from "clsx";
import {
  chatHeaderTitle,
  type ChatPreview,
  type MockUser,
} from "../state/store";

export interface ChatCardProps {
  chat: ChatPreview;
  peerUser?: MockUser | null;
  active: boolean;
  onSelect: () => void;
}

export function ChatCard({ chat, peerUser, active, onSelect }: ChatCardProps) {
  const showOnlineMarker = chat.type === "person" && Boolean(peerUser);
  const isOnline = Boolean(peerUser?.isOnline);

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
        <div className="flex min-w-0 items-center gap-2">
          {showOnlineMarker ? (
            <span
              className={clsx("h-2.5 w-2.5 rounded-full", {
                "bg-success": isOnline,
                "bg-base-content/30": !isOnline,
              })}
              aria-label={isOnline ? "В сети" : "Не в сети"}
              title={isOnline ? "В сети" : "Не в сети"}
            />
          ) : null}
          <div className="truncate font-medium">{chatHeaderTitle(chat)}</div>
        </div>
        {chat.unread > 0 && (
          <span className="badge badge-primary badge-sm">{chat.unread}</span>
        )}
      </div>
      <div className="mt-1 text-xs text-base-content/70">{chat.subtitle}</div>
    </div>
  );
}
