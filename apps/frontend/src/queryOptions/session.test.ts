import { describe, expect, it, vi } from "vitest";
import { sessionCheckQueryOptions } from "./session";
import { check } from "../api/session";

vi.mock("../api/session", () => ({
  check: vi.fn(async () => null),
}));

describe("sessionCheckQueryOptions", () => {
  it("builds a stable key and uses check api", async () => {
    const options = sessionCheckQueryOptions();

    expect(options.queryKey).toEqual(["session", "check"]);

    await options.queryFn();
    expect(check).toHaveBeenCalledTimes(1);
  });
});
