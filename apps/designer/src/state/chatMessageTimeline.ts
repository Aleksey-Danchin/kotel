import type { ChatMessage } from "./store";

export type ChatTimelineRow =
  | {
      kind: "day-badge";
      key: string;
      dayKey: string;
      label: string;
    }
  | {
      kind: "message";
      key: string;
      message: ChatMessage;
    };

function dayKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const dayBadgeCurrentYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});

const dayBadgeOtherYearsFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dayBadgeWeekdayFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
});

const timeTodayFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

const timeCurrentYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const timeOtherYearsFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMessageTimestamp(
  iso: string,
  now: Date = new Date(),
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  if (isSameDay(date, now)) return timeTodayFormatter.format(date);
  if (date.getFullYear() === now.getFullYear()) {
    return timeCurrentYearFormatter.format(date);
  }
  return timeOtherYearsFormatter.format(date);
}

function formatDayBadgeLabel(date: Date, now: Date): string {
  const weekday = dayBadgeWeekdayFormatter
    .format(date)
    .toLowerCase()
    .replace(".", "")
    .trim()
    .slice(0, 2);
  const dateLabel =
    date.getFullYear() === now.getFullYear()
      ? dayBadgeCurrentYearFormatter.format(date)
      : dayBadgeOtherYearsFormatter.format(date);
  return `${dateLabel} (${weekday})`;
}

export function buildChatTimelineRows(
  messages: ChatMessage[],
  now: Date = new Date(),
): ChatTimelineRow[] {
  const rows: ChatTimelineRow[] = [];
  let lastDayKey: string | null = null;

  for (const message of messages) {
    const d = new Date(message.createdAt);
    if (Number.isNaN(d.getTime())) {
      rows.push({
        kind: "message",
        key: `message:${message.id}`,
        message,
      });
      continue;
    }

    const dayKey = dayKeyFromDate(d);
    if (dayKey !== lastDayKey) {
      rows.push({
        kind: "day-badge",
        key: `day:${dayKey}`,
        dayKey,
        label: formatDayBadgeLabel(d, now),
      });
      lastDayKey = dayKey;
    }

    rows.push({
      kind: "message",
      key: `message:${message.id}`,
      message,
    });
  }

  return rows;
}
