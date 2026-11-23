"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLessonComplete } from "@/app/(member)/courses/actions";
import { Icon } from "@/components/icon";
import { pillClass } from "@/components/ui";

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
      className={pillClass(optimistic ? "success" : "secondary")}
    >
      <Icon name={optimistic ? "check" : "circle-check"} size={16} />
      {optimistic ? "Completed" : "Mark as complete"}
    </button>
  );
}
