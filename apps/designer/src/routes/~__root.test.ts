import { describe, expect, it } from "vitest";

import { resolveEscapeNavigationAction } from "./~__root";

describe("resolveEscapeNavigationAction", () => {
  it("exits chat to server on chat route", () => {
    expect(
      resolveEscapeNavigationAction("/kotel.localhost/chat_general", null),
    ).toBe("exit-chat");
  });

  it("exits server to root on server route", () => {
    expect(resolveEscapeNavigationAction("/kotel.localhost", null)).toBe(
      "exit-server",
    );
  });

  it("clears remembered active server outside hierarchical routes", () => {
    expect(resolveEscapeNavigationAction("/", "kotel.localhost")).toBe(
      "clear-active-server",
    );
  });

  it("does nothing when there is no route-level or remembered context", () => {
    expect(resolveEscapeNavigationAction("/", null)).toBe("none");
  });
});
