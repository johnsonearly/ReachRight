import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";
import { TextButton } from "./ui";

function MockBadge() {
  const aiMode = useStore((s) => s.aiMode);
  const setAiMode = useStore((s) => s.setAiMode);

  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((h) => !cancelled && setAiMode(h.mock ? "mock" : "live"))
      .catch(() => !cancelled && setAiMode("offline"));
    return () => {
      cancelled = true;
    };
  }, [setAiMode]);

  if (aiMode === "mock") {
    return (
      <span
        className="rounded-full border border-stone-300 px-2 py-0.5 text-xs text-stone-700"
        title="No ANTHROPIC_API_KEY is set, so the AI answers are realistic examples."
      >
        Mock AI mode
      </span>
    );
  }
  if (aiMode === "offline") {
    return <span className="rounded-full border border-red-300 px-2 py-0.5 text-xs text-red-800">Server offline</span>;
  }
  return null;
}

function ResetDemo() {
  const resetDemo = useStore((s) => s.resetDemo);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) return <TextButton onClick={() => setConfirming(true)}>Reset demo</TextButton>;
  return (
    <span className="flex items-center gap-3 text-sm" role="group" aria-label="Confirm reset">
      <span className="text-stone-700">Clear everything?</span>
      <TextButton
        onClick={() => {
          resetDemo();
          setConfirming(false);
          navigate("/business");
        }}
      >
        Yes, reset
      </TextButton>
      <TextButton className="text-stone-600" onClick={() => setConfirming(false)}>
        Cancel
      </TextButton>
    </span>
  );
}

export function Header() {
  return (
    <header className="border-b border-stone-200">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <Link to="/business" className="text-lg font-semibold tracking-tight text-stone-900">
            ReachRight
          </Link>
          <MockBadge />
        </div>
        <ResetDemo />
      </div>
    </header>
  );
}
