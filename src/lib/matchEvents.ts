import type { BusinessType, CustomerType, EventMatch, LocalEvent } from "../types";

/** Event tags that signal a fit for each business type. */
export const BUSINESS_TYPE_TAGS: Record<BusinessType, string[]> = {
  coffee_shop: ["coffee", "food", "morning", "study", "students", "remote-work", "community", "local"],
  bookstore: ["books", "reading", "literature", "writers", "comics", "study", "students", "culture"],
  clothing_boutique: ["fashion", "style", "vintage", "sustainability", "shopping", "design"],
  gift_shop: ["gifts", "holiday", "crafts", "artisan", "makers", "local", "shopping"],
  other: ["local", "community", "market", "shopping"],
};

/**
 * Score = 60% business-type fit + 40% fit with the best-matching customer type.
 * Each fit is the share of tag hits needed for a full score (5 business tags, 4 customer tags).
 */
const BUSINESS_WEIGHT = 0.6;
const CUSTOMER_WEIGHT = 0.4;
const BUSINESS_HITS_FOR_FULL = 5;
const CUSTOMER_HITS_FOR_FULL = 4;

/** The parts of a customer type used for matching, plus optional extra keywords. */
export type MatchCustomer = Pick<CustomerType, "id" | "name" | "ageRange" | "description"> & { keywords?: string[] };

export interface MatchOptions {
  businessType: BusinessType;
  customers: MatchCustomer[];
  /** Events before this date are dropped. Omit to keep every event. */
  now?: Date;
  /** Matches scoring below this are dropped. Defaults to 1 (drop zero-overlap events). */
  minScore?: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `tag` (or its hyphen-split form, singular or plural) appears as a word in `text`. */
export function textMentionsTag(text: string, tag: string): boolean {
  const phrase = tag.toLowerCase().replace(/-/g, " ");
  const stem = phrase.endsWith("s") ? phrase.slice(0, -1) : phrase;
  const pattern = new RegExp(`\\b${escapeRegExp(stem)}(s|es)?\\b`, "i");
  return pattern.test(text);
}

/** Lower-cased text describing who a customer type is, used for tag matching. */
export function customerText(customer: MatchCustomer): string {
  const parts = [customer.description, ...(customer.keywords ?? [])];
  const ages = customer.ageRange.match(/\d+/g)?.map(Number) ?? [];
  const minAge = ages[0];
  if (minAge !== undefined && minAge <= 30) parts.push("young adults");
  return parts.join(" | ").toLowerCase();
}

function formatList(items: string[]): string {
  const clean = items.map((t) => t.replace(/-/g, " "));
  if (clean.length <= 1) return clean.join("");
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

/**
 * Scores local events against a business type and its customer types by tag overlap.
 * Pure function: no I/O, deterministic for the same input.
 */
export function matchEvents(events: LocalEvent[], options: MatchOptions): EventMatch[] {
  const { businessType, customers, now, minScore = 1 } = options;
  const businessTags = new Set(BUSINESS_TYPE_TAGS[businessType]);
  const customerTexts = customers.map((c) => ({ customer: c, text: customerText(c) }));
  const today = now ? now.toISOString().slice(0, 10) : null;

  const matches: EventMatch[] = [];

  for (const event of events) {
    if (today && event.date < today) continue;

    const businessHits = event.tags.filter((t) => businessTags.has(t));

    let bestCustomer: MatchCustomer | null = null;
    let bestCustomerHits: string[] = [];
    for (const { customer, text } of customerTexts) {
      const hits = event.tags.filter((t) => textMentionsTag(text, t));
      if (hits.length > bestCustomerHits.length) {
        bestCustomer = customer;
        bestCustomerHits = hits;
      }
    }

    const businessFit = Math.min(1, businessHits.length / BUSINESS_HITS_FOR_FULL);
    const customerFit = Math.min(1, bestCustomerHits.length / CUSTOMER_HITS_FOR_FULL);
    const score = Math.round((businessFit * BUSINESS_WEIGHT + customerFit * CUSTOMER_WEIGHT) * 100);
    if (score < minScore) continue;

    const matchedTags = Array.from(new Set([...businessHits, ...bestCustomerHits]));
    const reason =
      matchedTags.length > 0
        ? `The crowd here shares your focus on ${formatList(matchedTags.slice(0, 3))}.`
        : "Little in common with your shop.";

    matches.push({ event, score, reason, matchedTags, bestCustomerId: bestCustomer?.id ?? null });
  }

  return matches.sort((a, b) => b.score - a.score || a.event.date.localeCompare(b.event.date));
}
