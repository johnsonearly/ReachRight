import { useId } from "react";

const FIT_SCORE_HELP = "An AI estimate of how well this matches your business and customer. It is not a guarantee of results.";

/** "Fit score" label with an info tooltip that opens on hover or keyboard focus. */
export function FitScoreLabel() {
  const tipId = useId();
  return (
    <span className="group relative inline-flex items-center gap-1 text-xs font-medium text-stone-600">
      Fit score
      <button
        type="button"
        aria-describedby={tipId}
        aria-label="What is a fit score?"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-stone-400 text-[10px] leading-none text-stone-600"
      >
        i
      </button>
      <span
        id={tipId}
        role="tooltip"
        className="invisible absolute top-full right-0 z-10 mt-2 w-60 rounded-lg bg-stone-900 px-3 py-2 text-xs font-normal text-white opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {FIT_SCORE_HELP}
      </span>
    </span>
  );
}

/** A score as a number plus a thin bar. */
export function FitScore({ score }: { score: number }) {
  return (
    <span className="flex w-24 shrink-0 flex-col items-end gap-1">
      <span className="text-sm font-semibold text-stone-900 tabular-nums">
        {score}
        <span className="sr-only"> out of 100 fit score</span>
      </span>
      <span className="h-1 w-full rounded-full bg-stone-200" aria-hidden="true">
        <span className="block h-full rounded-full bg-accent-700" style={{ width: `${score}%` }} />
      </span>
    </span>
  );
}

export function BestFitTag() {
  return <span className="rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-semibold text-accent-800">Best fit</span>;
}
