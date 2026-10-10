import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ChannelFrame, ContentView } from "../components/ChannelPreview";
import { ActionBar, ErrorNotice, inputClass, labelClass, PageTitle, PrimaryButton, Skeleton, TextButton, TextLink } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { useCurrentContent, useSelection, useStore } from "../store/useStore";
import type { BusinessProfile, ChannelOption, ContentItem, CustomerType } from "../types";

function parseHashtags(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .slice(0, 2);
}

function ContentEditor({ item, businessName, tagsText, setTagsText }: { item: ContentItem; businessName: string; tagsText: string; setTagsText: (v: string) => void }) {
  const updateContent = useStore((s) => s.updateContent);
  const ids = { subject: useId(), body: useId(), tags: useId(), brief: useId() };
  const isEmail = item.channel.kind === "online" && item.channel.id === "email";

  return (
    <ChannelFrame channel={item.channel} businessName={businessName}>
      {isEmail && (
        <div>
          <label htmlFor={ids.subject} className={labelClass}>
            Subject line
          </label>
          <input
            id={ids.subject}
            className={inputClass}
            value={item.subjectLine ?? ""}
            maxLength={120}
            onChange={(e) => updateContent(item.id, { subjectLine: e.target.value })}
          />
        </div>
      )}
      <div>
        <label htmlFor={ids.body} className={labelClass}>
          Text
        </label>
        <textarea id={ids.body} rows={8} className={inputClass} value={item.body} onChange={(e) => updateContent(item.id, { body: e.target.value })} />
      </div>
      {!isEmail && (
        <div>
          <label htmlFor={ids.tags} className={labelClass}>
            Hashtags <span className="font-normal text-stone-600">(up to 2)</span>
          </label>
          <input
            id={ids.tags}
            className={inputClass}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            onBlur={() => updateContent(item.id, { hashtags: parseHashtags(tagsText) })}
          />
        </div>
      )}
      <div>
        <label htmlFor={ids.brief} className={labelClass}>
          Image to create
        </label>
        <textarea
          id={ids.brief}
          rows={3}
          className={inputClass}
          value={item.imageBrief}
          onChange={(e) => updateContent(item.id, { imageBrief: e.target.value })}
        />
      </div>
    </ChannelFrame>
  );
}

function Review({ business, customerType, channel }: { business: BusinessProfile; customerType: CustomerType; channel: ChannelOption }) {
  const navigate = useNavigate();
  const current = useCurrentContent();
  const createContent = useStore((s) => s.createContent);
  const replaceGenerated = useStore((s) => s.replaceGenerated);
  const updateContent = useStore((s) => s.updateContent);
  const approve = useStore((s) => s.approve);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const requestedFor = useRef<string | null>(null);

  // Reuse the current item only if it was made for this exact customer type and channel.
  const item =
    current && current.customerTypeId === customerType.id && current.channel.id === channel.id && current.status !== "published"
      ? current
      : undefined;

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.content({ business, customerType, channel });
      if (item) replaceGenerated(item.id, res.content, res.mock);
      else createContent({ customerType, channel, content: res.content, mock: res.mock });
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [business, customerType, channel, item, createContent, replaceGenerated]);

  useEffect(() => {
    const key = `${customerType.id}|${channel.id}`;
    if (!item && requestedFor.current !== key) {
      requestedFor.current = key;
      void generate();
    }
  }, [item, customerType.id, channel.id, generate]);

  useEffect(() => setTagsText(item?.hashtags.join(" ") ?? ""), [item?.hashtags]);

  const finishEditing = () => {
    if (item && editing) updateContent(item.id, { hashtags: parseHashtags(tagsText) });
    setEditing(false);
  };

  const approved = item?.status === "approved";

  return (
    <>
      <PageTitle title="Review your content" />
      <p className="-mt-4 mb-6 text-sm text-stone-700">
        For: <strong>{customerType.name}</strong> via <strong>{channel.name}</strong> · <TextLink to="/choose">Change</TextLink>
      </p>

      <div aria-live="polite">
        {loading && <Skeleton lines={4} label="Writing your content..." />}
        {error && !loading && <ErrorNotice message={error} onRetry={() => void generate()} />}
      </div>

      {item && !loading && (
        <>
          {editing ? (
            <ContentEditor item={item} businessName={business.name} tagsText={tagsText} setTagsText={setTagsText} />
          ) : (
            <ContentView content={item} channel={item.channel} businessName={business.name} />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <TextButton onClick={() => (editing ? finishEditing() : setEditing(true))}>{editing ? "Done editing" : "Edit"}</TextButton>
            <TextButton onClick={() => void generate()}>Regenerate</TextButton>
            <span className="ml-auto text-sm text-stone-600" role="status">
              {approved ? "✓ Approved" : "Draft"}
              {item.generatedByMock ? " · mock AI text" : ""}
            </span>
          </div>
        </>
      )}

      <ActionBar
        secondary={<TextLink to="/choose">Back</TextLink>}
        primary={
          approved ? (
            <PrimaryButton onClick={() => navigate("/publish")}>Continue to publish</PrimaryButton>
          ) : (
            <PrimaryButton
              disabled={!item || loading || !item.body.trim()}
              onClick={() => {
                if (!item) return;
                finishEditing();
                approve(item.id);
              }}
            >
              Approve
            </PrimaryButton>
          )
        }
      />
    </>
  );
}

export function ReviewPage() {
  const profile = useStore((s) => s.profile);
  const { customerType, channel } = useSelection();
  if (!profile) return <Navigate to="/business" replace />;
  if (!customerType || !channel) return <Navigate to="/choose" replace />;
  return <Review business={profile} customerType={customerType} channel={channel} />;
}
