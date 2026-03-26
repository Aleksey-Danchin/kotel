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

  it("isNearBottom uses increased default threshold in 80–88px range", () => {
    expect(DESIGNER_CHAT_STICKY_THRESHOLD_PX).toBeGreaterThanOrEqual(80);
    expect(DESIGNER_CHAT_STICKY_THRESHOLD_PX).toBeLessThanOrEqual(88);
    expect(
      isNearBottom({
        scrollHeight: 400,
        scrollTop: 16,
        clientHeight: 300,
      }),
    ).toBe(true);
    expect(
      isNearBottom({
        scrollHeight: 400,
        scrollTop: 15,
        clientHeight: 300,
      }),
    ).toBe(false);
  });
});
