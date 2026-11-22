"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLessonComplete } from "@/app/(member)/courses/actions";

/** Mark a lesson complete / not complete (AC-20). */
export function CompleteButton({ lessonId, complete }: { lessonId: string; complete: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(complete);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggleLessonComplete(lessonId, !optimistic);
        })
      }
      className={`self-start rounded-md px-4 py-2 text-sm font-medium ${
        optimistic
          ? "bg-green-700 text-white"
          : "border border-zinc-300 dark:border-zinc-700"
      }`}
    >
      {optimistic ? "✓ Completed" : "Mark as complete"}
    </button>
  );
}
