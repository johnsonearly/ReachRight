import { Link, useLocation } from "react-router-dom";

export const STEPS = [
  { path: "/business", label: "Business" },
  { path: "/choose", label: "Choose" },
  { path: "/review", label: "Review" },
  { path: "/publish", label: "Publish" },
] as const;

/** Slim 4-step progress indicator. Earlier steps are links; later ones are plain text. */
export function Stepper() {
  const { pathname } = useLocation();
  const current = STEPS.findIndex((s) => pathname.startsWith(s.path));
  if (current === -1) return null;

  return (
    <nav aria-label="Progress" className="mx-auto max-w-3xl px-5 pt-6">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          const label = (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  state === "todo" ? "bg-stone-100 text-stone-600" : "bg-accent-700 text-white"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={state === "current" ? "font-semibold text-stone-900" : "text-stone-600"}>{step.label}</span>
            </span>
          );
          return (
            <li key={step.path} className="flex flex-1 items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
              {state === "done" ? (
                <Link to={step.path} className="rounded hover:underline">
                  {label}
                  <span className="sr-only"> (completed)</span>
                </Link>
              ) : (
                label
              )}
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className={`h-px flex-1 ${i < current ? "bg-accent-700" : "bg-stone-200"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
