import { afterEach, describe, expect, it, vi } from "vitest";

import {
  initialSettingsTabForSource,
  resolveSettingsTabsForSession,
} from "./settingsOverlay";
import type { ServerSession } from "./servers";

function makeSession(serverUrl: string, role: string): ServerSession {
  return {
    id: "srv",
    serverUrl,
    user: {
      id: "u-1",
      fullname: "Test User",
      login: "test",
      role,
    },
  };
}

describe("initialSettingsTabForSource", () => {
  it("maps each gear source to expected initial tab", () => {
    expect(initialSettingsTabForSource("services")).toBe("main");
    expect(initialSettingsTabForSource("chats")).toBe("configurator");
    expect(initialSettingsTabForSource("chat")).toBe("users");
  });
});

describe("resolveSettingsTabsForSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns all tabs for root/admin on current server", () => {
    vi.stubGlobal("window", { location: { host: "app.example:3000" } });
    const rootSession = makeSession("https://app.example:3000", "root");
    const adminSession = makeSession("https://app.example:3000", "ADMIN");

    expect(resolveSettingsTabsForSession(rootSession).map((tab) => tab.label)).toEqual([
      "основной",
      "конфигуратор",
      "пользователи",
      "аккаунт",
    ]);
    expect(resolveSettingsTabsForSession(adminSession).map((tab) => tab.label)).toEqual([
      "основной",
      "конфигуратор",
      "пользователи",
      "аккаунт",
    ]);
  });

  it("returns only account tab for non-privileged role", () => {
    vi.stubGlobal("window", { location: { host: "app.example:3000" } });
    const session = makeSession("https://app.example:3000", "designer");

    expect(resolveSettingsTabsForSession(session).map((tab) => tab.label)).toEqual([
      "аккаунт",
    ]);
  });

  it("returns only account tab for admin/root on non-current server", () => {
    vi.stubGlobal("window", { location: { host: "app.example:3000" } });
    const session = makeSession("https://other.example:3000", "root");

    expect(resolveSettingsTabsForSession(session).map((tab) => tab.label)).toEqual([
      "аккаунт",
    ]);
  });
});
