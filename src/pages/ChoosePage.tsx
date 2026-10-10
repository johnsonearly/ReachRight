import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BestFitTag, FitScore, FitScoreLabel } from "../components/FitScore";
import { ActionBar, ErrorNotice, PageTitle, PrimaryButton, Skeleton, TextLink } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { useSelection, useStore } from "../store/useStore";
import type { BusinessProfile, ChannelOption, CustomerType } from "../types";

interface OptionCardProps {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}

/** A radio option styled as a card. Selected = accent border plus a check mark. */
function OptionCard({ name, value, checked, onSelect, children }: OptionCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-600 ${
        checked ? "border-2 border-accent-700 p-[15px]" : "border-stone-200 hover:border-stone-400"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
          checked ? "border-accent-700 bg-accent-700 text-white" : "border-stone-300"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-lg font-semibold text-stone-900">
        {title}
      </h2>
      <FitScoreLabel />
    </div>
  );
}

function CustomerTypeList({ types, selectedId, onSelect }: { types: CustomerType[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const best = types[0]?.id;
  return (
    <div role="radiogroup" aria-labelledby="who-heading" className="space-y-3">
      {types.map((t) => (
        <OptionCard key={t.id} name="customerType" value={t.id} checked={t.id === selectedId} onSelect={() => onSelect(t.id)}>
          <span className="flex items-start justify-between gap-4">
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-stone-900">{t.name}</span>
                <span className="text-sm text-stone-600">{t.ageRange}</span>
                {t.id === best && <BestFitTag />}
              </span>
              <span className="mt-1 block text-sm text-stone-700">{t.description}</span>
            </span>
            <FitScore score={t.fitScore} />
          </span>
          <span className="mt-2 block text-sm text-stone-600">{t.reason}</span>
        </OptionCard>
      ))}
    </div>
  );
}

function ChannelList({ channels, selectedId, onSelect }: { channels: ChannelOption[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const best = channels[0]?.id;
  return (
    <div role="radiogroup" aria-labelledby="where-heading" className="space-y-3">
      {channels.map((c) => (
        <OptionCard key={c.id} name="channel" value={c.id} checked={c.id === selectedId} onSelect={() => onSelect(c.id)}>
          <span className="flex items-start justify-between gap-4">
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-stone-900">{c.name}</span>
                {c.id === best && <BestFitTag />}
              </span>
              <span className="mt-0.5 block text-xs text-stone-600">
                {c.kind === "online" ? "Online" : "Local event · Sample data"}
                {c.detail ? ` · ${c.detail}` : ""}
              </span>
            </span>
            <FitScore score={c.fitScore} />
          </span>
          <span className="mt-2 block text-sm text-stone-600">{c.reason}</span>
        </OptionCard>
      ))}
    </div>
  );
}

function Choose({ business }: { business: BusinessProfile }) {
  const navigate = useNavigate();
  const customerTypes = useStore((s) => s.customerTypes);
  const channelsByType = useStore((s) => s.channelsByType);
  const selectedTypeId = useStore((s) => s.selectedTypeId);
  const selectedChannelId = useStore((s) => s.selectedChannelId);
  const setAnalysis = useStore((s) => s.setAnalysis);
  const setChannelsFor = useStore((s) => s.setChannelsFor);
  const selectCustomerType = useStore((s) => s.selectCustomerType);
  const selectChannel = useStore((s) => s.selectChannel);
  const { customerType, channel } = useSelection();

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const analyzeRequested = useRef(false);
  // The ref guards against duplicate calls (StrictMode runs effects twice); the state drives rendering.
  const scoringInFlight = useRef(new Set<string>());
  const [scoringIds, setScoringIds] = useState<string[]>([]);

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      setAnalysis(await api.analyze({ business }));
    } catch (err) {
      setAnalyzeError(errorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }, [business, setAnalysis]);

  useEffect(() => {
    if (customerTypes.length === 0 && !analyzeRequested.current) {
      analyzeRequested.current = true;
      void analyze();
    }
  }, [customerTypes.length, analyze]);

  const scoreChannels = useCallback(
    async (type: CustomerType) => {
      if (scoringInFlight.current.has(type.id)) return;
      scoringInFlight.current.add(type.id);
      setScoringIds((ids) => [...ids, type.id]);
      setScoringError(null);
      try {
        const res = await api.analyze({ business, customerType: type });
        setChannelsFor(type.id, res.channels);
      } catch (err) {
        setScoringError(errorMessage(err));
      } finally {
        scoringInFlight.current.delete(type.id);
        setScoringIds((ids) => ids.filter((id) => id !== type.id));
      }
    },
    [business, setChannelsFor],
  );

  // Channels are scored per customer type; fetch them the first time a type is selected.
  useEffect(() => {
    if (customerType && !channelsByType[customerType.id] && !scoringError) void scoreChannels(customerType);
  }, [customerType, channelsByType, scoreChannels, scoringError]);

  const channels = selectedTypeId ? channelsByType[selectedTypeId] : undefined;
  const scoring = customerType ? scoringIds.includes(customerType.id) : false;

  return (
    <>
      <PageTitle title="Choose who and where" intro={`Pick one customer type for ${business.name}, then one place to reach them.`} />

      {analyzing && <Skeleton lines={3} label="Analysing your business..." />}
      {analyzeError && <ErrorNotice message={analyzeError} onRetry={() => void analyze()} />}

      {customerTypes.length > 0 && (
        <div className="space-y-10">
          <section>
            <SectionHeading id="who-heading" title="Who to reach" />
            <CustomerTypeList
              types={customerTypes}
              selectedId={selectedTypeId}
              onSelect={(id) => {
                setScoringError(null);
                selectCustomerType(id);
              }}
            />
          </section>

          <section aria-busy={scoring}>
            <SectionHeading id="where-heading" title={customerType ? `Where to reach ${customerType.name.toLowerCase()}` : "Where to reach them"} />
            {!customerType && <p className="text-sm text-stone-600">Choose a customer type first.</p>}
            {customerType && scoring && <Skeleton lines={4} label={`Scoring places for ${customerType.name}...`} />}
            {customerType && scoringError && !scoring && (
              // Clearing the error lets the effect above fetch again.
              <ErrorNotice message={scoringError} onRetry={() => setScoringError(null)} />
            )}
            {channels && !scoring && <ChannelList channels={channels} selectedId={selectedChannelId} onSelect={selectChannel} />}
          </section>
        </div>
      )}

      <ActionBar
        secondary={<TextLink to="/business">Back</TextLink>}
        primary={
          <PrimaryButton disabled={!customerType || !channel} onClick={() => navigate("/review")}>
            Create my content
          </PrimaryButton>
        }
      />
    </>
  );
}

export function ChoosePage() {
  const profile = useStore((s) => s.profile);
  if (!profile) return <Navigate to="/business" replace />;
  return <Choose business={profile} />;
}
