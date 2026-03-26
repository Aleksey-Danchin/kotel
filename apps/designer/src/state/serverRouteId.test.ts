import { describe, expect, it } from "vitest";

import type { ServerSession } from "./servers";
import {
  serverRouteIdFromServerUrl,
  serverUrlFromServersByRouteId,
} from "./serverRouteId";

describe("serverRouteIdFromServerUrl", () => {
  it("maps https host without port", () => {
    expect(serverRouteIdFromServerUrl("https://kotel.localhost/")).toBe(
      "kotel.localhost",
    );
  });

  it("replaces colon in host (port)", () => {
    expect(serverRouteIdFromServerUrl("http://127.0.0.1:8081/")).toBe(
      "127.0.0.1.8081",
    );
  });
});

describe("serverUrlFromServersByRouteId", () => {
  it("finds session by route id", () => {
    const map = new Map<string, ServerSession>([
      [
        "https://kotel.localhost",
        {
          serverUrl: "https://kotel.localhost",
          user: { id: "u1", fullname: "x", login: "x", role: "r" },
        },
      ],
    ]);
    expect(serverUrlFromServersByRouteId(map, "kotel.localhost")).toBe(
      "https://kotel.localhost",
    );
  });
});
