import { afterEach, describe, expect, it, vi } from "vitest";

import {
  enterChat,
  enterServer,
  exitChatToServer,
  exitServerToRoot,
  isConfiguratorPath,
  resolveConfiguratorNavigationTarget,
  serverRouteIdToClearAfterPathChange,
} from "./designerNavigation";
import { serverRouteIdFromServerUrl } from "./serverRouteId";
import { resetServersStore, serversAtom, setServerSession } from "./servers";
import { defaultStore } from "../global/defaultStore";
import { activeServerIdAtom } from "./selectionAtoms";

const mainUrl = "https://kotel.localhost";
const altUrl = "https://alt.kotel.localhost";

afterEach(() => {
  resetServersStore();
  defaultStore.set(activeServerIdAtom, null);
});
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

describe("hierarchical navigation helpers", () => {
  it("navigates to /:serverId or /:serverId/:chatId for enter flows", () => {
    const navigate = vi.fn();
    const mainRid = serverRouteIdFromServerUrl(mainUrl);

    enterServer(navigate, mainRid);
    enterChat(navigate, "chat_general", mainRid);

    expect(navigate).toHaveBeenNthCalledWith(1, {
      to: "/$serverId",
      params: { serverId: mainRid },
    });
    expect(navigate).toHaveBeenNthCalledWith(2, {
      to: "/$serverId/$chatId",
      params: { serverId: mainRid, chatId: "chat_general" },
    });
  });

  it("navigates to /:serverId and / for escape-like exits", () => {
    const navigate = vi.fn();
    const mainRid = serverRouteIdFromServerUrl(mainUrl);

    exitChatToServer(navigate, mainRid);
    exitServerToRoot(navigate);

    expect(navigate).toHaveBeenNthCalledWith(1, {
      to: "/$serverId",
      params: { serverId: mainRid },
    });
    expect(navigate).toHaveBeenNthCalledWith(2, { to: "/" });
  });
});

describe("resolveConfiguratorNavigationTarget", () => {
  it("returns /config/:serverId when active server exists", () => {
    setServerSession({
      id: "srv-main",
      serverUrl: mainUrl,
      user: {
        id: "u-1",
        fullname: "Admin",
        login: "admin",
        role: "ADMIN",
      },
    });
    const mainRid = serverRouteIdFromServerUrl(mainUrl);

    const target = resolveConfiguratorNavigationTarget(
      mainRid,
      defaultStore.get(serversAtom),
    );

    expect(target).toEqual({
      to: "/config/$serverId",
      params: { serverId: mainRid },
    });
  });

  it("returns /config when active server is absent or stale", () => {
    setServerSession({
      id: "srv-main",
      serverUrl: mainUrl,
      user: {
        id: "u-1",
        fullname: "Admin",
        login: "admin",
        role: "ADMIN",
      },
    });
    const staleRid = serverRouteIdFromServerUrl(altUrl);
    const serversMap = defaultStore.get(serversAtom);

    expect(resolveConfiguratorNavigationTarget(null, serversMap)).toEqual({
      to: "/config",
    });
    expect(resolveConfiguratorNavigationTarget(staleRid, serversMap)).toEqual({
      to: "/config",
    });
  });
});
