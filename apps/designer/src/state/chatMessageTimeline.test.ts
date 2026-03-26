import { describe, expect, it } from "vitest";

import {
  buildChatTimelineRows,
  formatMessageTimestamp,
} from "./chatMessageTimeline";
import type { ChatMessage } from "./store";

function message(
  id: string,
  createdAt: string,
  userId: string = "u-1",
  text: string = "hello",
): ChatMessage {
  return { id, createdAt, userId, text };
}

describe("chatMessageTimeline", () => {
  describe("formatMessageTimestamp", () => {
    it("formats today's messages as HH:mm", () => {
      const now = new Date("2026-03-26T18:30:00.000Z");
      const formatted = formatMessageTimestamp("2026-03-26T05:06:00.000Z", now);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it("formats current year dates without year", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const formatted = formatMessageTimestamp("2026-01-05T07:08:00.000Z", now);
      expect(formatted).toContain("янв");
      expect(formatted).not.toContain("2026");
    });

    it("formats older year dates with year", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const formatted = formatMessageTimestamp("2024-11-25T07:08:00.000Z", now);
      expect(formatted).toContain("2024");
    });
  });

  describe("buildChatTimelineRows", () => {
    it("adds one day badge before each date group", () => {
      const rows = buildChatTimelineRows([
        message("m-1", "2026-03-25T08:00:00.000Z"),
        message("m-2", "2026-03-25T09:00:00.000Z"),
        message("m-3", "2026-03-26T10:00:00.000Z"),
      ]);

      expect(rows.map((row) => row.kind)).toEqual([
        "day-badge",
        "message",
        "message",
        "day-badge",
        "message",
      ]);
      expect(rows[0]).toMatchObject({ kind: "day-badge", key: "day:2026-2-25" });
      expect(rows[3]).toMatchObject({ kind: "day-badge", key: "day:2026-2-26" });
    });
  });
});
