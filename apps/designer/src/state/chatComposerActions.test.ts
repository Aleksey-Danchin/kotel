import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultStore } from "../global/defaultStore";
import {
  DESIGNER_CHAT_AUTOREPLY_MS,
  designerAppendedChatMessagesAtom,
  getMergedChatMessages,
  sendDesignerChatMessage,
} from "./chatComposerActions";

describe("getMergedChatMessages", () => {
  it("merges mock thread with appended and sorts by createdAt", () => {
    const appended = {
      chat_general: [
        {
          id: "x1",
          userId: "a",
          text: "late",
          createdAt: "2026-03-25T09:00:00.000Z",
        },
      ],
    };
    const merged = getMergedChatMessages("chat_general", appended);
    expect(merged.length).toBeGreaterThan(1);
    for (let i = 1; i < merged.length; i++) {
      expect(
        merged[i - 1]!.createdAt.localeCompare(merged[i]!.createdAt),
      ).toBeLessThanOrEqual(0);
    }
  });
});

describe("sendDesignerChatMessage", () => {
  beforeEach(() => {
    defaultStore.set(designerAppendedChatMessagesAtom, {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not append when text is whitespace only", () => {
    sendDesignerChatMessage("chat_general", "  \n\t  ", "mock-user-1");
    expect(
      defaultStore.get(designerAppendedChatMessagesAtom)["chat_general"],
    ).toBeUndefined();
  });

  it("appends outgoing then incoming duplicate after delay", () => {
    vi.useFakeTimers();
    sendDesignerChatMessage("chat_general", "ping", "mock-user-1");

    const mid = defaultStore.get(designerAppendedChatMessagesAtom)[
      "chat_general"
    ]!;
    expect(mid).toHaveLength(1);
    expect(mid[0]!.text).toBe("ping");
    expect(mid[0]!.userId).toBe("mock-user-1");

    vi.advanceTimersByTime(DESIGNER_CHAT_AUTOREPLY_MS - 1);
    expect(
      defaultStore.get(designerAppendedChatMessagesAtom)["chat_general"],
    ).toHaveLength(1);

    vi.advanceTimersByTime(1);
    const final = defaultStore.get(designerAppendedChatMessagesAtom)[
      "chat_general"
    ]!;
    expect(final).toHaveLength(2);
    expect(final[1]!.text).toBe("ping");
    expect(final[1]!.userId).not.toBe("mock-user-1");
  });
});
