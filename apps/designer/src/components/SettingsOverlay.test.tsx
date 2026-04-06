import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { defaultStore } from "../global/defaultStore";
import { SettingsOverlay } from "./SettingsOverlay";
import { routeContextAtom } from "../state/store";
import { resetServersStore, setServerSession } from "../state/servers";
import {
  isSettingsOpenAtom,
  settingsActiveTabAtom,
  settingsInitialTabAtom,
  settingsServerUrlAtom,
} from "../state/settingsOverlay";
import { serverRouteIdFromServerUrl } from "../state/serverRouteId";

const serverUrl = "https://kotel.localhost";

function seedSelectedServer(): string {
  setServerSession({
    id: "srv-main",
    serverUrl,
    user: {
      id: "u-1",
      fullname: "Admin User",
      login: "admin",
      role: "ADMIN",
    },
  });
  return serverRouteIdFromServerUrl(serverUrl);
}

afterEach(() => {
  resetServersStore();
  defaultStore.set(routeContextAtom, { type: "index" });
  defaultStore.set(isSettingsOpenAtom, false);
  defaultStore.set(settingsInitialTabAtom, "main");
  defaultStore.set(settingsActiveTabAtom, "main");
  defaultStore.set(settingsServerUrlAtom, null);
});

describe("SettingsOverlay route mode", () => {
  it("renders configurator content without modal open toggle", () => {
    const serverId = seedSelectedServer();
    defaultStore.set(routeContextAtom, { type: "config-server", serverId });
    defaultStore.set(isSettingsOpenAtom, false);

    const html = renderToStaticMarkup(<SettingsOverlay mode="route" />);

    expect(html).toContain("Настройка");
    expect(html).toContain("сервера");
    expect(html).toContain("Сохранить");
  });

  it("keeps overlay mode hidden when modal state is closed", () => {
    const serverId = seedSelectedServer();
    defaultStore.set(routeContextAtom, { type: "config-server", serverId });
    defaultStore.set(isSettingsOpenAtom, false);

    const html = renderToStaticMarkup(<SettingsOverlay />);

    expect(html).toBe("");
  });
});
