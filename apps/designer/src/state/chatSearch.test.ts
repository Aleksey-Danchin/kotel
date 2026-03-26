import { describe, expect, it } from "vitest";
import { isSearchMatch, tokenizeSearchQuery } from "./chatSearch";

describe("tokenizeSearchQuery", () => {
  it("splits by spaces and normalizes case", () => {
    expect(tokenizeSearchQuery("  Ди   Ал ")).toEqual(["ди", "ал"]);
  });
});

describe("isSearchMatch", () => {
  it("matches regardless token order", () => {
    expect(isSearchMatch("Далин Ог`Дип", "ди ал")).toBe(true);
    expect(isSearchMatch("Далин Ог`Дип", "ал ди")).toBe(true);
  });

  it("returns false when one token is missing", () => {
    expect(isSearchMatch("Мария Волкова", "мария backend")).toBe(false);
  });
});
