import { describe, expect, it } from "vitest";

import { serverCardTitle } from "./ServerCard";

describe("serverCardTitle", () => {
  it("prefers explicit server name", () => {
    expect(
      serverCardTitle({
        serverUrl: "https://server.example:3000",
        name: "Main Server",
        user: {
          id: "u-1",
          fullname: "User One",
          login: "user1",
          role: "designer",
        },
      }),
    ).toBe("Main Server");
  });

  it("falls back to host for legacy entries without name", () => {
    expect(
      serverCardTitle({
        serverUrl: "https://legacy.example:3000",
        user: {
          id: "u-1",
          fullname: "User One",
          login: "user1",
          role: "designer",
        },
      }),
    ).toBe("legacy.example");
  });
});
