import { halifaxEvents } from "../src/data/halifaxEvents";
import { CHANNEL_LABELS, formatDate } from "../src/lib/labels";
import { matchEvents, type MatchCustomer } from "../src/lib/matchEvents";
import { normalizeScored } from "../src/lib/scores";
import { CHANNELS, type BusinessProfile, type Channel, type ChannelOption, type LocalEvent } from "../src/types";

/** At most this many places are shown to the owner. */
export const MAX_CHANNELS = 5;
/** At most this many sample events are offered to the model as candidates. */
const MAX_EVENT_CANDIDATES = 6;

export const ONLINE_CHANNEL_NOTES: Record<Channel, string> = {
  instagram: "photo and short-video posts; strong with under-35s",
  facebook: "page posts and community groups; strong with 35+ and neighbourhood groups",
  linkedin: "posts from the owner; reaches local professionals",
  email: "newsletter to people who already opted in; needs an existing list",
  tiktok: "short vertical videos; strong with under-25s",
};

export function isOnlineChannel(id: string): id is Channel {
  return (CHANNELS as readonly string[]).includes(id);
}

export function findEvent(id: string): LocalEvent | undefined {
  return halifaxEvents.find((e) => e.id === id);
}

/** Upcoming sample events that overlap with the business (and customer, if given), best first. */
export function eventCandidates(business: BusinessProfile, customers: MatchCustomer[], now = new Date()) {
  return matchEvents(halifaxEvents, { businessType: business.type, customers, now }).slice(0, MAX_EVENT_CANDIDATES);
}

function eventDetail(event: LocalEvent): string {
  return `${formatDate(event.date)} · ${event.location}`;
}

/**
 * Builds a ChannelOption from a candidate id, using our own names and details (never the model's).
 * Returns null for ids that are not a known channel or event.
 */
export function toChannelOption(id: string, fitScore: number, reason: string): ChannelOption | null {
  if (isOnlineChannel(id)) return { id, name: CHANNEL_LABELS[id], kind: "online", fitScore, reason };
  const event = findEvent(id);
  if (event) return { id, name: event.name, kind: "event", fitScore, reason, detail: eventDetail(event) };
  return null;
}

/** Keeps only scores for allowed candidate ids, then clamps, dedupes, sorts and caps the list. */
export function buildChannelList(
  scores: { id: string; fitScore: number; reason: string }[],
  allowedIds: Set<string>,
): ChannelOption[] {
  const options = scores.flatMap((s) => {
    if (!allowedIds.has(s.id)) return [];
    const option = toChannelOption(s.id, s.fitScore, s.reason);
    return option ? [option] : [];
  });
  return normalizeScored(options, MAX_CHANNELS);
}
