import { describe, expect, it } from "vitest";

import { selectionIdFromPathname } from "./routePath";

describe("selectionIdFromPathname", () => {
  it("returns null for root", () => {
    expect(selectionIdFromPathname("/")).toBeNull();
    expect(selectionIdFromPathname("")).toBeNull();
  });

  it("skips static routes", () => {
    expect(selectionIdFromPathname("/setup")).toBeNull();
    expect(selectionIdFromPathname("/setup/")).toBeNull();
    expect(selectionIdFromPathname("/session-test")).toBeNull();
    expect(selectionIdFromPathname("/users")).toBeNull();
    expect(selectionIdFromPathname("/callback")).toBeNull();
  });

  it("returns first segment for dynamic selection", () => {
    expect(selectionIdFromPathname("/kotel.localhost")).toBe("kotel.localhost");
    expect(selectionIdFromPathname("/chat_general")).toBe("chat_general");
  });
});
