import { describe, expect, it } from "vitest";

import { resolveDesignerRoutePath } from "./routePath";

describe("resolveDesignerRoutePath", () => {
  it("resolves index route for root and static pages", () => {
    expect(resolveDesignerRoutePath("/")).toEqual({ kind: "index" });
    expect(resolveDesignerRoutePath("")).toEqual({ kind: "index" });
    expect(resolveDesignerRoutePath("/setup")).toEqual({ kind: "index" });
    expect(resolveDesignerRoutePath("/session-test")).toEqual({ kind: "index" });
    expect(resolveDesignerRoutePath("/users")).toEqual({ kind: "index" });
    expect(resolveDesignerRoutePath("/callback")).toEqual({ kind: "index" });
  });

  it("resolves configurator routes before dynamic server segment", () => {
    expect(resolveDesignerRoutePath("/config")).toEqual({ kind: "config" });
    expect(resolveDesignerRoutePath("/config/kotel.localhost")).toEqual({
      kind: "config-server",
      serverId: "kotel.localhost",
    });
  });

  it("resolves dynamic server and chat routes", () => {
    expect(resolveDesignerRoutePath("/kotel.localhost")).toEqual({
      kind: "server",
      serverId: "kotel.localhost",
    });
    expect(resolveDesignerRoutePath("/kotel.localhost/chat_general")).toEqual({
      kind: "server-chat",
      serverId: "kotel.localhost",
      chatId: "chat_general",
    });
  });
});
