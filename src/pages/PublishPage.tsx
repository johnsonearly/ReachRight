import { useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ContentView } from "../components/ChannelPreview";
import { ActionBar, PageTitle, PrimaryButton, TextButton, TextLink } from "../components/ui";
import { formatDateTime } from "../lib/labels";
import { useCurrentContent, useStore } from "../store/useStore";
import type { ContentItem } from "../types";

function Confirmation({ item }: { item: ContentItem }) {
  const startAnother = useStore((s) => s.startAnother);
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen reader and keyboard users land on it.
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="py-10 text-center">
      <p aria-hidden="true" className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-lg text-accent-700">
        ✓
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-semibold text-stone-900 focus:outline-none">
        Published to {item.channel.name}
      </h1>
      {item.publishedAt && <p className="mt-2 text-stone-600">{formatDateTime(item.publishedAt)}</p>}
      <p className="mt-1 text-sm text-stone-600">This is a simulation. Nothing was posted to a real account.</p>
      <div className="mt-8 flex justify-center gap-8">
        <TextButton
          onClick={() => {
            startAnother();
            navigate("/choose");
          }}
        >
          Create another
        </TextButton>
        <TextLink to="/results">Track results</TextLink>
      </div>
    </div>
  );
}

function Publish({ item, businessName }: { item: ContentItem; businessName: string }) {
  const publish = useStore((s) => s.publish);
  return (
    <>
      <PageTitle title="Ready to publish" intro={`For ${item.customerTypeName} via ${item.channel.name}.`} />
      <ContentView content={item} channel={item.channel} businessName={businessName} />
      <p className="mt-3 text-sm text-stone-600">Publishing is simulated in this prototype. Nothing is posted to real accounts.</p>
      <ActionBar
        secondary={<TextLink to="/review">Back</TextLink>}
        primary={<PrimaryButton onClick={() => publish(item.id)}>Publish</PrimaryButton>}
      />
    </>
  );
}

export function PublishPage() {
  const item = useCurrentContent();
  const businessName = useStore((s) => s.profile?.name ?? "Your shop");
  if (!item) return <Navigate to="/choose" replace />;
  if (item.status === "draft") return <Navigate to="/review" replace />;
  return item.status === "published" ? <Confirmation item={item} /> : <Publish item={item} businessName={businessName} />;
}
