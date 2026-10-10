import { describe, expect, it } from "vitest";
import { formatRate, responseRate } from "./results";

describe("responseRate", () => {
  it("divides responses by impressions", () => {
    expect(responseRate(30, 1200)).toBeCloseTo(0.025);
  });

  it("returns null when there are no impressions", () => {
    expect(responseRate(5, 0)).toBeNull();
    expect(formatRate(responseRate(5, 0))).toBe("n/a");
  });
});
