import { describe, expect, it } from "vitest";

import { generateUserPassword, resolveUserEditability } from "./settingsUsers";

describe("resolveUserEditability", () => {
  it("prevents admin from editing root user", () => {
    expect(resolveUserEditability("ADMIN", "ROOT")).toEqual({
      canEdit: false,
      canChangeRole: false,
    });
  });

  it("allows root to edit root user except role", () => {
    expect(resolveUserEditability("ROOT", "ROOT")).toEqual({
      canEdit: true,
      canChangeRole: false,
    });
  });

  it("allows admin to edit non-root users", () => {
    expect(resolveUserEditability("ADMIN", "USER")).toEqual({
      canEdit: true,
      canChangeRole: true,
    });
  });
});

describe("generateUserPassword", () => {
  it("returns 12 alphanumeric characters by default", () => {
    const password = generateUserPassword();
    expect(password).toMatch(/^[A-Za-z0-9]{12}$/);
  });
});
