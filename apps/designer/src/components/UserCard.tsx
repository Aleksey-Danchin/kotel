import clsx from "clsx";
import { ChatFeedCardBase } from "./ChatFeedCardBase";
import type { MockUser } from "../state/store";
import { formatUserPresenceSubtitle } from "../state/userPresence";

export interface UserCardProps {
  user: MockUser;
  onSelect: () => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  const statusText = formatUserPresenceSubtitle(user.isOnline, user.lastSeenAt);
  const leading = (
    <span
      className={clsx("h-2.5 w-2.5 rounded-full", {
        "bg-success": user.isOnline,
        "bg-base-content/30": !user.isOnline,
      })}
      aria-label={user.isOnline ? "В сети" : "Не в сети"}
      title={user.isOnline ? "В сети" : "Не в сети"}
    />
  );

  return (
    <ChatFeedCardBase
      title={user.fullname}
      subtitle={statusText}
      leading={leading}
      onSelect={onSelect}
    />
  );
}
