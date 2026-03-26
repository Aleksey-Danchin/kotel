import { afterEach, describe, expect, it, vi } from "vitest";

import { clientMatchesServerUrl, roleAllowsHeaderGear } from "./headerGear";

describe("clientMatchesServerUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("compares URL host with window.location.host", () => {
    vi.stubGlobal("window", { location: { host: "localhost:5173" } });
    expect(clientMatchesServerUrl("http://localhost:5173")).toBe(true);
    expect(clientMatchesServerUrl("http://localhost:8080")).toBe(false);
  });
});

describe("roleAllowsHeaderGear", () => {
  it("accepts admin and root case-insensitively", () => {
    expect(roleAllowsHeaderGear("admin")).toBe(true);
    expect(roleAllowsHeaderGear("ADMIN")).toBe(true);
    expect(roleAllowsHeaderGear(" root ")).toBe(true);
    expect(roleAllowsHeaderGear("operator")).toBe(false);
  });
});

