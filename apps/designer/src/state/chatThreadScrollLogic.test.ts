import { describe, expect, it } from "vitest";

import {
  DESIGNER_CHAT_STICKY_THRESHOLD_PX,
  distanceFromBottom,
  isNearBottom,
} from "./chatThreadScrollLogic";

describe("chatThreadScrollLogic", () => {
  it("distanceFromBottom matches scroll metrics", () => {
    expect(
      distanceFromBottom({
        scrollHeight: 500,
        scrollTop: 100,
        clientHeight: 300,
      }),
    ).toBe(100);
  });

  it("isNearBottom uses default threshold in 24–32px range", () => {
    expect(DESIGNER_CHAT_STICKY_THRESHOLD_PX).toBeGreaterThanOrEqual(24);
    expect(DESIGNER_CHAT_STICKY_THRESHOLD_PX).toBeLessThanOrEqual(32);
    expect(
      isNearBottom({
        scrollHeight: 400,
        scrollTop: 72,
        clientHeight: 300,
      }),
    ).toBe(true);
    expect(
      isNearBottom({
        scrollHeight: 400,
        scrollTop: 71,
        clientHeight: 300,
      }),
    ).toBe(false);
  });
});
