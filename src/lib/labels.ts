import type { BusinessType, Channel } from "../types";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  coffee_shop: "Coffee shop",
  bookstore: "Bookstore",
  clothing_boutique: "Clothing boutique",
  gift_shop: "Gift shop",
  other: "Other",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  email: "Email newsletter",
  tiktok: "TikTok",
};

export const HALIFAX_NEIGHBOURHOODS = [
  "Downtown",
  "North End",
  "South End",
  "West End",
  "Quinpool",
  "Waterfront",
  "Clayton Park",
  "Fairview",
  "Bedford",
  "Dartmouth",
];

export function formatDate(iso: string): string {
  // Date-only strings are parsed as UTC; pin to noon to avoid off-by-one in local time.
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}
