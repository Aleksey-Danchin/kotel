import clsx from "clsx";
import { HiUserGroup } from "react-icons/hi";
import { ChatFeedCardBase } from "./ChatFeedCardBase";
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
  const showGroupMarker = chat.type === "group";
  const isOnline = Boolean(peerUser?.isOnline);
  const leading = showOnlineMarker ? (
    <span
      className={clsx("h-2.5 w-2.5 rounded-full", {
        "bg-success": isOnline,
        "bg-base-content/30": !isOnline,
      })}
      aria-label={isOnline ? "В сети" : "Не в сети"}
      title={isOnline ? "В сети" : "Не в сети"}
    />
  ) : showGroupMarker ? (
    <HiUserGroup
      className="h-4 w-4 text-base-content/60"
      aria-label="Групповой чат"
      title="Групповой чат"
    />
  ) : null;

  return (
    <ChatFeedCardBase
      title={chatHeaderTitle(chat)}
      subtitle={chat.subtitle}
      leading={leading}
      unread={chat.unread}
      active={active}
      onSelect={onSelect}
    />
  );
}
