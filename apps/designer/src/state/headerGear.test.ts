import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clientMatchesServerUrl,
  roleAllowsHeaderGear,
  shouldShowColumnHeaderGear,
} from "./headerGear";

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

describe("shouldShowColumnHeaderGear", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires both host match and role", () => {
    vi.stubGlobal("window", { location: { host: "app.example:3000" } });
    expect(shouldShowColumnHeaderGear("https://app.example:3000", "root")).toBe(
      true,
    );
    expect(
      shouldShowColumnHeaderGear("https://other.example:3000", "root"),
    ).toBe(false);
    expect(
      shouldShowColumnHeaderGear("https://app.example:3000", "viewer"),
    ).toBe(false);
  });
});
