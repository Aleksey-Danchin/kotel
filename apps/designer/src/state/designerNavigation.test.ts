import { describe, expect, it } from "vitest";

import { serverRouteIdToClearAfterPathChange } from "./designerNavigation";
import type { ServerSession } from "./servers";
import { serverRouteIdFromServerUrl } from "./serverRouteId";

const mainUrl = "https://kotel.localhost";
const altUrl = "https://alt.kotel.localhost";
const session: ServerSession = {
  serverUrl: mainUrl,
  user: { id: "u", fullname: "u", login: "u", role: "r" },
  id: "srv_main",
};
const altSession: ServerSession = {
  serverUrl: altUrl,
  user: { id: "u2", fullname: "u2", login: "u2", role: "r" },
  id: "srv_alt",
};

function mapOne(): Map<string, ServerSession> {
  return new Map([[mainUrl, session]]);
}

function mapTwo(): Map<string, ServerSession> {
  return new Map([
    [mainUrl, session],
    [altUrl, altSession],
  ]);
}

describe("serverRouteIdToClearAfterPathChange", () => {
  it("returns server route id when leaving chat URL for a server URL", () => {
    const mainRid = serverRouteIdFromServerUrl(mainUrl);
    expect(
      serverRouteIdToClearAfterPathChange(
        "/chat_general",
        `/${mainRid}`,
        mapOne(),
        mainRid,
      ),
    ).toBe(mainRid);
  });

  it("returns server route id when leaving chat URL for index", () => {
    expect(
      serverRouteIdToClearAfterPathChange(
        "/chat_general",
        "/",
        mapOne(),
        serverRouteIdFromServerUrl(mainUrl),
      ),
    ).toBe(serverRouteIdFromServerUrl(mainUrl));
  });

  it("returns null when the path still points at the same chat id", () => {
    expect(
      serverRouteIdToClearAfterPathChange(
        "/chat_general",
        "/chat_general",
        mapOne(),
        serverRouteIdFromServerUrl(mainUrl),
      ),
    ).toBeNull();
  });

  it("returns null when previous path was not a chat", () => {
    const mainRid = serverRouteIdFromServerUrl(mainUrl);
    expect(
      serverRouteIdToClearAfterPathChange(
        `/${mainRid}`,
        "/",
        mapOne(),
        mainRid,
      ),
    ).toBeNull();
  });

  it("does not clear last chat when switching from chat to another server", () => {
    const altRid = serverRouteIdFromServerUrl(altUrl);
    expect(
      serverRouteIdToClearAfterPathChange(
        "/chat_general",
        `/${altRid}`,
        mapTwo(),
        serverRouteIdFromServerUrl(mainUrl),
      ),
    ).toBeNull();
  });
});
