import { describe, expect, it } from "vitest";

import {
  isConfiguratorPath,
  serverRouteIdToClearAfterPathChange,
} from "./designerNavigation";
import { serverRouteIdFromServerUrl } from "./serverRouteId";

const mainUrl = "https://kotel.localhost";
const altUrl = "https://alt.kotel.localhost";
describe("serverRouteIdToClearAfterPathChange", () => {
  it("returns server route id when leaving chat URL for a server URL", () => {
    const mainRid = serverRouteIdFromServerUrl(mainUrl);
    expect(
      serverRouteIdToClearAfterPathChange(
        `/${mainRid}/${"chat_general"}`,
        `/${mainRid}`,
      ),
    ).toBe(mainRid);
  });

  it("returns server route id when leaving chat URL for index", () => {
    expect(
      serverRouteIdToClearAfterPathChange(
        `/${serverRouteIdFromServerUrl(mainUrl)}/${"chat_general"}`,
        "/",
      ),
    ).toBe(serverRouteIdFromServerUrl(mainUrl));
  });

  it("returns null when the path still points at the same chat id", () => {
    expect(
      serverRouteIdToClearAfterPathChange(
        `/${serverRouteIdFromServerUrl(mainUrl)}/${"chat_general"}`,
        `/${serverRouteIdFromServerUrl(mainUrl)}/${"chat_general"}`,
      ),
    ).toBeNull();
  });

  it("returns null when previous path was not a chat", () => {
    const mainRid = serverRouteIdFromServerUrl(mainUrl);
    expect(
      serverRouteIdToClearAfterPathChange(`/${mainRid}`, "/"),
    ).toBeNull();
  });

  it("does not clear last chat when switching from chat to another server", () => {
    const altRid = serverRouteIdFromServerUrl(altUrl);
    expect(
      serverRouteIdToClearAfterPathChange(
        `/${serverRouteIdFromServerUrl(mainUrl)}/${"chat_general"}`,
        `/${altRid}`,
      ),
    ).toBeNull();
  });
});

describe("isConfiguratorPath", () => {
  it("returns true for /config and /config/:serverId routes", () => {
    expect(isConfiguratorPath("/config")).toBe(true);
    expect(isConfiguratorPath("/config/kotel.localhost")).toBe(true);
  });

  it("returns false for non-config routes", () => {
    expect(isConfiguratorPath("/")).toBe(false);
    expect(isConfiguratorPath("/kotel.localhost")).toBe(false);
    expect(isConfiguratorPath("/kotel.localhost/chat_general")).toBe(false);
  });
});
