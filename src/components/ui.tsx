import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

export function PrimaryButton({ className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600 ${className}`}
    >
      {children}
    </button>
  );
}

/** Secondary actions are plain text links, whether they navigate or act. */
const textLinkClass = "text-sm font-medium text-accent-700 underline-offset-4 hover:underline disabled:text-stone-400 disabled:no-underline";

export function TextButton({ className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={`${textLinkClass} ${className}`}>
      {children}
    </button>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={textLinkClass}>
      {children}
    </Link>
  );
}

export function PageTitle({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
      {intro && <p className="mt-2 text-stone-600">{intro}</p>}
    </div>
  );
}

/** Bottom-of-content action row: secondary text link on the left, the one primary action on the right. */
export function ActionBar({ secondary, primary }: { secondary?: ReactNode; primary?: ReactNode }) {
  return (
    <div className="mt-10 flex flex-wrap-reverse items-center justify-between gap-4 border-t border-stone-200 pt-6">
      <div>{secondary}</div>
      <div>{primary}</div>
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-stone-300 p-4 text-sm">
      <p className="font-medium text-stone-900">That didn't work.</p>
      <p className="mt-1 text-stone-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-900 hover:bg-stone-50"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return (
    <div role="status" aria-live="polite">
      <p className="mb-3 text-sm text-stone-600">{label}</p>
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-stone-100" />
        ))}
      </div>
    </div>
  );
}

export function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center">
      <p className="font-medium text-stone-900">{title}</p>
      {children && <div className="mt-2 text-sm text-stone-600">{children}</div>}
    </div>
  );
}

export const inputClass =
  "mt-1.5 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 placeholder:text-stone-500 focus:border-accent-700 focus:ring-2 focus:ring-accent-100 focus:outline-none aria-[invalid=true]:border-red-700";

export const labelClass = "block text-sm font-medium text-stone-800";
