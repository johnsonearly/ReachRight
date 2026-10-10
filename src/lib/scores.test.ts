import { describe, expect, it } from "vitest";
import { clampScore, normalizeScored } from "./scores";

describe("clampScore", () => {
  it("rounds and clamps to an integer between 0 and 100", () => {
    expect(clampScore(-12)).toBe(0);
    expect(clampScore(140)).toBe(100);
    expect(clampScore(72.6)).toBe(73);
    expect(clampScore(Number.NaN)).toBe(0);
  });
});

describe("normalizeScored", () => {
  const items = [
    { id: "a", fitScore: 40 },
    { id: "b", fitScore: 250 },
    { id: "c", fitScore: -5 },
    { id: "d", fitScore: 81.4 },
    { id: "b", fitScore: 10 },
  ];

  it("clamps scores to 0-100 and sorts them descending", () => {
    const result = normalizeScored(items);
    expect(result.map((i) => i.fitScore)).toEqual([100, 81, 40, 0]);
    result.forEach((i) => {
      expect(Number.isInteger(i.fitScore)).toBe(true);
      expect(i.fitScore).toBeGreaterThanOrEqual(0);
      expect(i.fitScore).toBeLessThanOrEqual(100);
    });
  });

  it("drops duplicate ids, caps the list and does not mutate the input", () => {
    const copy = structuredClone(items);
    const result = normalizeScored(items, 2);
    expect(result.map((i) => i.id)).toEqual(["b", "d"]);
    expect(items).toEqual(copy);
  });
});
