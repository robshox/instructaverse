"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setPlanListedAction } from "./actions";

/** Switch that shows or hides a plan on /pricing, saved immediately (AC-31). */
export function ListedToggle({ planId, planName, listed }: { planId: string; planName: string; listed: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(listed);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={`${planName}: listed on pricing page`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            setOptimistic(!optimistic);
            const result = await setPlanListedAction(planId, !optimistic);
            if (result.error) setError(result.error);
          })
        }
        className={`relative h-5 w-[34px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${optimistic ? "bg-accent" : "bg-line-strong"}`}
      >
        <span className={`absolute top-[3px] size-3.5 rounded-full transition-all ${optimistic ? "left-[17px] bg-on-accent" : "left-[3px] bg-muted"}`} />
      </button>
      <span className={`text-sm ${optimistic ? "" : "text-muted"}`}>{optimistic ? "Listed on pricing page" : "Unlisted · hidden from pricing"}</span>
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </div>
  );
}
