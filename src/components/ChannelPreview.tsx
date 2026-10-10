import type { ReactNode } from "react";
import type { ChannelOption, GeneratedContent } from "../types";

function handleFor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function frameHeader(channel: ChannelOption, businessName: string): { title: string; subtitle: string } {
  if (channel.kind === "event") return { title: businessName, subtitle: `Flyer for ${channel.name}` };
  switch (channel.id) {
    case "instagram":
      return { title: handleFor(businessName), subtitle: "Instagram post" };
    case "tiktok":
      return { title: `@${handleFor(businessName)}`, subtitle: "TikTok caption" };
    case "linkedin":
      return { title: businessName, subtitle: "LinkedIn post · Halifax, NS" };
    case "email":
      return { title: businessName, subtitle: "Email newsletter" };
    default:
      return { title: businessName, subtitle: "Facebook post" };
  }
}

/** Frame styled lightly after the chosen channel. Body content is passed in so it can be shown or edited. */
export function ChannelFrame({ channel, businessName, children }: { channel: ChannelOption; businessName: string; children: ReactNode }) {
  const { title, subtitle } = frameHeader(channel, businessName);
  return (
    <div className="rounded-xl border border-stone-200">
      <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">
          {businessName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">{title}</p>
          <p className="text-xs text-stone-600">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

/** Read-only view of generated content inside its channel frame. */
export function ContentView({ content, channel, businessName }: { content: GeneratedContent; channel: ChannelOption; businessName: string }) {
  return (
    <ChannelFrame channel={channel} businessName={businessName}>
      {content.subjectLine && (
        <p className="text-sm">
          <span className="text-stone-600">Subject: </span>
          <span className="font-semibold text-stone-900">{content.subjectLine}</span>
        </p>
      )}
      <p className="text-[15px] leading-relaxed whitespace-pre-line text-stone-900">{content.body}</p>
      {content.hashtags.length > 0 && <p className="text-sm font-medium text-stone-700">{content.hashtags.join(" ")}</p>}
      <div className="rounded-lg bg-stone-50 p-3 text-sm">
        <p className="text-xs font-medium text-stone-600">Image to create</p>
        <p className="mt-1 text-stone-800">{content.imageBrief}</p>
      </div>
    </ChannelFrame>
  );
}
