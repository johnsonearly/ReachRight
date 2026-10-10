// Shared domain types for the ReachRight client and server.

export const BUSINESS_TYPES = [
  "coffee_shop",
  "bookstore",
  "clothing_boutique",
  "gift_shop",
  "other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export interface BusinessProfile {
  name: string;
  type: BusinessType;
  neighbourhood: string;
  description: string;
}

export const CHANNELS = [
  "instagram",
  "facebook",
  "linkedin",
  "email",
  "tiktok",
] as const;
export type Channel = (typeof CHANNELS)[number];

/** An AI-estimated customer type. fitScore is an integer 0-100, not a probability. */
export interface CustomerType {
  id: string;
  name: string;
  ageRange: string;
  description: string;
  fitScore: number;
  reason: string;
}

/**
 * A place to reach a customer type: an online channel (id is a Channel)
 * or a local event (id is a LocalEvent id). fitScore is an integer 0-100.
 */
export interface ChannelOption {
  id: string;
  name: string;
  kind: "online" | "event";
  fitScore: number;
  reason: string;
  /** Short extra detail, e.g. event date and place. */
  detail?: string;
}

export interface LocalEvent {
  id: string;
  name: string;
  /** ISO date (YYYY-MM-DD) of the next occurrence. */
  date: string;
  recurring?: string;
  location: string;
  neighbourhood: string;
  audience: string;
  tags: string[];
}

export interface EventMatch {
  event: LocalEvent;
  /** 0 to 100. */
  score: number;
  reason: string;
  matchedTags: string[];
  /** Customer type whose description overlaps most with the event, if any. */
  bestCustomerId: string | null;
}

export type ContentStatus = "draft" | "approved" | "published";

export interface GeneratedContent {
  body: string;
  hashtags: string[];
  subjectLine?: string;
  imageBrief: string;
}

export interface ContentItem extends GeneratedContent {
  id: string;
  customerTypeId: string;
  customerTypeName: string;
  channel: ChannelOption;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  /** True when the text came from mock mode rather than the live model. */
  generatedByMock: boolean;
}

export interface Baseline {
  impressions: number;
  responses: number;
}

export interface ResultsEntry {
  contentId: string;
  impressions: number;
  responses: number;
  loggedAt: string;
}

// ---- API contracts ----

export interface AnalyzeRequest {
  business: BusinessProfile;
  /** When given, only channels are re-scored for this customer type. */
  customerType?: CustomerType;
}

export interface AnalyzeResponse {
  customerTypes: CustomerType[];
  channels: ChannelOption[];
  /** Id of the customer type the channels were scored for. */
  channelsFor: string;
  mock: boolean;
}

export interface ContentRequest {
  business: BusinessProfile;
  customerType: CustomerType;
  channel: ChannelOption;
}

export interface ContentResponse {
  content: GeneratedContent;
  mock: boolean;
}

export interface HealthResponse {
  ok: true;
  mock: boolean;
  model: string;
}

export interface ApiErrorBody {
  error: string;
}
