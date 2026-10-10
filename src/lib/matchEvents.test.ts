import { describe, expect, it } from "vitest";
import type { LocalEvent } from "../types";
import { matchEvents, textMentionsTag, type MatchCustomer } from "./matchEvents";

const event = (id: string, tags: string[], date = "2026-11-01"): LocalEvent => ({
  id,
  name: id,
  date,
  location: "Somewhere",
  neighbourhood: "Downtown",
  audience: "Anyone",
  tags,
});

const students: MatchCustomer = {
  id: "ct-students",
  name: "Campus crammers",
  ageRange: "18-24",
  description: "Students who want cheap coffee and a calm place to study near campus.",
};

const remote: MatchCustomer = {
  id: "ct-remote",
  name: "Remote workers",
  ageRange: "28-40",
  description: "Tech workers on remote work days looking for good espresso.",
};

describe("textMentionsTag", () => {
  it("matches singular and plural forms and hyphenated tags", () => {
    expect(textMentionsTag("campus libraries | student union", "students")).toBe(true);
    expect(textMentionsTag("remote work", "remote-work")).toBe(true);
    expect(textMentionsTag("good books", "book")).toBe(true);
  });

  it("does not match partial words", () => {
    expect(textMentionsTag("artisan bread", "art")).toBe(false);
  });
});

describe("matchEvents", () => {
  const events = [
    event("campus-fair", ["students", "campus", "coffee", "study"]),
    event("fashion-show", ["fashion", "style", "design"]),
    event("tech-meetup", ["tech", "remote-work", "coffee", "networking"]),
  ];

  it("ranks events by tag overlap with business type and customer types", () => {
    const result = matchEvents(events, { businessType: "coffee_shop", customers: [students, remote] });
    expect(result.map((m) => m.event.id)).toEqual(["campus-fair", "tech-meetup"]);
    expect(result[0]?.bestCustomerId).toBe("ct-students");
    expect(result[1]?.bestCustomerId).toBe("ct-remote");
  });

  it("drops events with no overlap and keeps scores within 0 to 100", () => {
    const result = matchEvents(events, { businessType: "coffee_shop", customers: [students] });
    expect(result.find((m) => m.event.id === "fashion-show")).toBeUndefined();
    result.forEach((m) => {
      expect(m.score).toBeGreaterThan(0);
      expect(m.score).toBeLessThanOrEqual(100);
    });
  });

  it("filters out events before `now`", () => {
    const past = event("old-market", ["coffee", "students"], "2020-01-01");
    const result = matchEvents([past, ...events], {
      businessType: "coffee_shop",
      customers: [students],
      now: new Date("2026-10-10T12:00:00Z"),
    });
    expect(result.some((m) => m.event.id === "old-market")).toBe(false);
  });

  it("is deterministic and does not mutate its input", () => {
    const copy = structuredClone(events);
    const a = matchEvents(events, { businessType: "coffee_shop", customers: [students] });
    const b = matchEvents(events, { businessType: "coffee_shop", customers: [students] });
    expect(a).toEqual(b);
    expect(events).toEqual(copy);
  });
});
