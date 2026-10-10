import { useId, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Notice, PageTitle, TextLink, inputClass, labelClass } from "../components/ui";
import { formatDateTime } from "../lib/labels";
import { formatRate, responseRate } from "../lib/results";
import { useStore } from "../store/useStore";
import type { ContentItem, ResultsEntry } from "../types";

// Neutral for "before", the accent for published items. Bars carry value labels and the table repeats the numbers.
const BEFORE_COLOR = "#a8a29e";
const AFTER_COLOR = "#a8471a";

type Counts = { impressions: number; responses: number };

function validateCounts(impressions: string, responses: string): { error: string } | Counts {
  const imp = Number(impressions);
  const resp = Number(responses);
  if (impressions.trim() === "" || responses.trim() === "" || !Number.isInteger(imp) || !Number.isInteger(resp) || imp < 0 || resp < 0) {
    return { error: "Enter whole numbers of 0 or more." };
  }
  if (imp === 0) return { error: "Impressions must be more than 0." };
  if (resp > imp) return { error: "Responses can't be more than impressions." };
  return { impressions: imp, responses: resp };
}

/** One row of impressions + responses inputs with a Save action. */
function CountsForm({ title, subtitle, initial, onSave }: { title: string; subtitle?: string; initial?: Counts; onSave: (c: Counts) => void }) {
  const [impressions, setImpressions] = useState(initial ? String(initial.impressions) : "");
  const [responses, setResponses] = useState(initial ? String(initial.responses) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const ids = { imp: useId(), resp: useId(), err: useId() };
  const rate = initial ? responseRate(initial.responses, initial.impressions) : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateCounts(impressions, responses);
    if ("error" in result) {
      setError(result.error);
      setSaved(false);
      return;
    }
    setError(null);
    setSaved(true);
    onSave(result);
  };

  const describedBy = error ? ids.err : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium text-stone-900">{title}</p>
          {subtitle && <p className="text-xs text-stone-600">{subtitle}</p>}
        </div>
        <p className="text-sm text-stone-700">Response rate: {formatRate(rate)}</p>
      </div>
      <div className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor={ids.imp} className={labelClass}>
            Impressions
          </label>
          <input
            id={ids.imp}
            inputMode="numeric"
            className={inputClass}
            value={impressions}
            onChange={(e) => setImpressions(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
        </div>
        <div>
          <label htmlFor={ids.resp} className={labelClass}>
            Responses
          </label>
          <input
            id={ids.resp}
            inputMode="numeric"
            className={inputClass}
            value={responses}
            onChange={(e) => setResponses(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
        </div>
        <button type="submit" className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-50">
          Save
        </button>
      </div>
      <div aria-live="polite">
        {error && (
          <p id={ids.err} className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && !error && <p className="mt-2 text-sm text-stone-600">Saved.</p>}
      </div>
    </form>
  );
}

interface ChartRow {
  name: string;
  rate: number;
  label: string;
  color: string;
}

function RatesChart({ rows }: { rows: ChartRow[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={rows.map((r) => `${r.name}: ${r.label}`).join("; ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 4, left: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#d6d3d1" }} tick={{ fill: "#44403c", fontSize: 12 }} interval={0} />
          <YAxis
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#57534e", fontSize: 12 }}
            width={52}
          />
          <Tooltip
            cursor={{ fill: "rgba(120,113,108,0.08)" }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as ChartRow | undefined) : undefined;
              if (!row) return null;
              return (
                <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                  <p className="font-medium text-stone-900">{row.name}</p>
                  <p className="text-stone-700">Response rate {row.label}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={72} isAnimationActive={false}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color} />
            ))}
            <LabelList dataKey="label" position="top" fill="#1c1917" fontSize={13} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortName(item: ContentItem): string {
  return item.channel.name.length > 18 ? `${item.channel.name.slice(0, 16)}…` : item.channel.name;
}

export function ResultsPage() {
  const baseline = useStore((s) => s.baseline);
  const setBaseline = useStore((s) => s.setBaseline);
  const results = useStore((s) => s.results);
  const logResult = useStore((s) => s.logResult);
  const items = useStore((s) => s.contentItems);
  const published = items.filter((i) => i.status === "published");

  const logged = published.flatMap((item) => {
    const entry: ResultsEntry | undefined = results[item.id];
    const rate = entry ? responseRate(entry.responses, entry.impressions) : null;
    return entry && rate !== null ? [{ item, entry, rate }] : [];
  });
  const beforeRate = baseline ? responseRate(baseline.responses, baseline.impressions) : null;

  const rows: ChartRow[] = [
    ...(beforeRate !== null ? [{ name: "Before", rate: beforeRate, label: formatRate(beforeRate), color: BEFORE_COLOR }] : []),
    ...logged.map(({ item, rate }) => ({ name: shortName(item), rate, label: formatRate(rate), color: AFTER_COLOR })),
  ];

  return (
    <>
      <PageTitle
        title="Track results"
        intro="Enter numbers from your post insights, email stats or coupon counts. Response rate is responses (replies, clicks or redemptions) divided by impressions."
      />

      <section className="divide-y divide-stone-200 border-y border-stone-200">
        <CountsForm
          title="Before ReachRight"
          subtitle="Your usual marketing over the last 4 to 8 weeks"
          initial={baseline ?? undefined}
          onSave={setBaseline}
        />
        {published.map((item) => (
          <CountsForm
            key={item.id}
            title={`${item.channel.name} · ${item.customerTypeName}`}
            subtitle={item.publishedAt ? `Published ${formatDateTime(item.publishedAt)}` : undefined}
            initial={results[item.id]}
            onSave={(c) => logResult({ contentId: item.id, ...c })}
          />
        ))}
      </section>
      {published.length === 0 && <p className="mt-3 text-sm text-stone-600">Published content will appear here so you can add its numbers.</p>}

      <section className="mt-10" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="mb-4 text-lg font-semibold text-stone-900">
          Response rates
        </h2>
        {rows.length === 0 ? (
          <Notice title="No numbers yet">Add your before numbers and results for a published item to see them side by side.</Notice>
        ) : (
          <>
            <RatesChart rows={rows} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <caption className="sr-only">Response rates by source</caption>
                <thead className="text-stone-600">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">Source</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Impressions</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Responses</th>
                    <th scope="col" className="py-2 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {baseline && beforeRate !== null && (
                    <tr>
                      <th scope="row" className="py-2 pr-4 font-normal">Before</th>
                      <td className="py-2 pr-4 text-right">{baseline.impressions.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">{baseline.responses.toLocaleString()}</td>
                      <td className="py-2 text-right">{formatRate(beforeRate)}</td>
                    </tr>
                  )}
                  {logged.map(({ item, entry, rate }) => (
                    <tr key={item.id}>
                      <th scope="row" className="py-2 pr-4 font-normal">{item.channel.name}</th>
                      <td className="py-2 pr-4 text-right">{entry.impressions.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">{entry.responses.toLocaleString()}</td>
                      <td className="py-2 text-right">{formatRate(rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="mt-6 text-xs text-stone-600">Results come only from the numbers you enter.</p>
      </section>

      <div className="mt-10 border-t border-stone-200 pt-6">
        <TextLink to="/choose">Create more content</TextLink>
      </div>
    </>
  );
}
