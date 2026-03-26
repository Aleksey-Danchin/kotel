import { describe, expect, it } from "vitest";

import {
  DESIGNER_CHAT_COMPOSER_MAX_CHARS,
  clampComposerText,
  remainingComposerChars,
  shouldShowComposerCounter,
} from "./chatComposerConstraints";

describe("chatComposerConstraints", () => {
  it("clamps text to 1024 chars", () => {
    const input = "x".repeat(DESIGNER_CHAT_COMPOSER_MAX_CHARS + 128);
    expect(clampComposerText(input)).toHaveLength(DESIGNER_CHAT_COMPOSER_MAX_CHARS);
  });

  it("computes remaining chars", () => {
    expect(remainingComposerChars("abc")).toBe(
      DESIGNER_CHAT_COMPOSER_MAX_CHARS - 3,
    );
  });

  it("shows counter only in final 50 chars", () => {
    expect(shouldShowComposerCounter(51)).toBe(false);
    expect(shouldShowComposerCounter(50)).toBe(true);
    expect(shouldShowComposerCounter(0)).toBe(true);
  });
});
