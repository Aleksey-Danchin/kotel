export function formatLastSeenRu(lastSeenAt: string): string {
  const parsed = new Date(lastSeenAt);
  if (Number.isNaN(parsed.getTime())) return "Неизвестно";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatOnlineDurationRu(lastSeenAt: string): string {
  const parsed = new Date(lastSeenAt);
  const startedAt = parsed.getTime();
  if (Number.isNaN(startedAt)) return "В сети";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60_000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `В сети ${hours} часов ${minutes} минут`;
}

export function formatUserPresenceSubtitle(
  isOnline: boolean,
  lastSeenAt: string,
): string {
  return isOnline
    ? formatOnlineDurationRu(lastSeenAt)
    : `Был(а) в сети: ${formatLastSeenRu(lastSeenAt)}`;
}
