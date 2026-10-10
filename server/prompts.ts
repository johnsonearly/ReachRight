import { BUSINESS_TYPE_LABELS } from "../src/lib/labels";
import type { BusinessProfile, Channel, CustomerType, EventMatch, LocalEvent } from "../src/types";
import { CHANNELS } from "../src/types";
import { ONLINE_CHANNEL_NOTES } from "./candidates";

const JSON_ONLY = "Respond with ONLY a single valid JSON object. No markdown, no code fences, no commentary before or after it.";

function describeBusiness(b: BusinessProfile): string {
  return [
    `Name: ${b.name}`,
    `Type: ${BUSINESS_TYPE_LABELS[b.type].toLowerCase()}`,
    `Neighbourhood: ${b.neighbourhood}, Halifax, Nova Scotia`,
    `Description: ${b.description}`,
  ].join("\n");
}

function describeCandidates(events: EventMatch[]): string {
  const online = CHANNELS.map((c) => `- id "${c}": ${ONLINE_CHANNEL_NOTES[c]}`).join("\n");
  const local =
    events.length > 0
      ? events
          .map(({ event: e }) => `- id "${e.id}": ${e.name}, ${e.date}${e.recurring ? ` (${e.recurring})` : ""}, ${e.location}. Audience: ${e.audience}`)
          .join("\n")
      : "(no local events overlap with this business)";
  return `Online channels:\n${online}\n\nLocal events (sample listings):\n${local}`;
}

const SCORE_RULES = `Fit scores:
- Each fitScore is an integer from 0 to 100: your judgement of how well the option matches this business and customer type.
- A fitScore is NOT a probability, a sales forecast or an accuracy figure. Never describe it that way.
- Spread scores out honestly; do not give everything a high score.
- Reasons are one short plain-language sentence (under 20 words). Do not invent statistics, percentages or facts not given here.`;

export const ANALYZE_SYSTEM = `You help small independent shops in Halifax, Nova Scotia decide who to market to and where.
You know Halifax well: its universities (Dalhousie, Saint Mary's, NSCAD, Mount Saint Vincent), neighbourhoods, the waterfront, and the mix of students, young professionals, families, retirees and visitors.

${SCORE_RULES}

${JSON_ONLY}`;

const CHANNEL_INSTRUCTIONS = `Score every candidate below for the customer type, then return the 5 best, mixing online channels and local events where events genuinely fit.
Use only the candidate ids listed. Do not add any other channel or event.`;

export function analyzeUserPrompt(b: BusinessProfile, events: EventMatch[]): string {
  return `Business:
${describeBusiness(b)}

Task 1: Identify 2 or 3 distinct customer types this shop is most likely to win, grounded in the description.
For each, give a short name, an age range, a one-line description (under 20 words, include their interests), a fitScore and a one-line reason.

Task 2: For the customer type with the HIGHEST fitScore only, score where to reach them.
${CHANNEL_INSTRUCTIONS}

Candidates:
${describeCandidates(events)}

Return JSON exactly in this shape:
{
  "customerTypes": [
    { "name": "Campus crammers", "ageRange": "18-24", "description": "...", "fitScore": 82, "reason": "..." }
  ],
  "channels": [
    { "id": "instagram", "fitScore": 78, "reason": "..." }
  ]
}`;
}

export function channelsUserPrompt(b: BusinessProfile, customer: CustomerType, events: EventMatch[]): string {
  return `Business:
${describeBusiness(b)}

Customer type: ${customer.name} (ages ${customer.ageRange}). ${customer.description}

Score where to reach this customer type.
${CHANNEL_INSTRUCTIONS}

Candidates:
${describeCandidates(events)}

Return JSON exactly in this shape:
{
  "channels": [
    { "id": "instagram", "fitScore": 78, "reason": "..." }
  ]
}`;
}

export const CONTENT_SYSTEM = `You write short marketing copy for small independent shops in Halifax, Nova Scotia.
Write in a warm, human voice that suits the customer type. Keep it concise and specific to the shop.

Honesty rules (mandatory):
- No false or unverifiable claims ("best in Halifax", "#1", "award-winning") unless the business description states them.
- Never invent discounts, offers, prices, giveaways, dates or opening hours that are not in the business description or event details.
- Never invent statistics, percentages, ratings or customer counts.
- No health, nutrition, wellness or medical claims.
- Do not imply endorsements or partnerships that were not stated.
- If you need a fact you do not have, leave a clear placeholder in square brackets, such as [stall number].

${JSON_ONLY}`;

function formatFor(channel: Channel): string {
  switch (channel) {
    case "email":
      return "Channel: email newsletter to people who opted in.\nFormat: subject line under 60 characters, then an email body of 80 to 140 words. hashtags must be an empty array.";
    case "linkedin":
      return "Channel: LinkedIn post from the shop owner.\nFormat: professional but friendly, 60 to 120 words. Exactly 2 hashtags. No subject line.";
    case "tiktok":
      return "Channel: TikTok caption, starting with a one-line on-screen hook.\nFormat: under 60 words. Exactly 2 hashtags. No subject line.";
    case "facebook":
      return "Channel: Facebook page post.\nFormat: conversational, 50 to 110 words. Exactly 2 hashtags. No subject line.";
    case "instagram":
      return "Channel: Instagram feed caption.\nFormat: 40 to 90 words, line breaks allowed, at most 2 emoji. Exactly 2 hashtags. No subject line.";
  }
}

export type ContentTarget = { kind: "online"; channel: Channel } | { kind: "event"; event: LocalEvent };

export function contentUserPrompt(b: BusinessProfile, customer: CustomerType, target: ContentTarget): string {
  const where =
    target.kind === "online"
      ? formatFor(target.channel)
      : `Event: ${target.event.name}
Date: ${target.event.date}${target.event.recurring ? ` (${target.event.recurring})` : ""}
Location: ${target.event.location}
Audience: ${target.event.audience}
Format: short copy for a stall sign or flyer handed out at this event. Under 90 words. Exactly 2 hashtags. No subject line.`;

  return `Business:
${describeBusiness(b)}

Customer type: ${customer.name} (ages ${customer.ageRange}). ${customer.description}

${where}

Also write an image brief: 1 or 2 sentences describing a photo or simple graphic the shop could make itself (subject, setting, mood). Realistic, no stock-photo cliches.

Return JSON exactly in this shape:
{
  "body": "the post, message or flyer copy",
  "hashtags": ["#OneTag", "#TwoTag"],
  "subjectLine": "only for email, otherwise omit this field",
  "imageBrief": "description of the photo or graphic"
}`;
}
