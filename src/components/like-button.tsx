"use client";

import { useOptimistic, useTransition } from "react";
import { setLikeAction } from "@/app/(member)/board/actions";
import type { LikeState, LikeTarget } from "@/lib/community/likes";

/** Like / unlike with an optimistic count (AC-46). */
export function LikeButton({ target, state }: { target: LikeTarget; state: LikeState }) {
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [, startTransition] = useTransition();

  function toggle() {
    const liked = !optimistic.liked;
    startTransition(async () => {
      setOptimistic({ liked, count: optimistic.count + (liked ? 1 : -1) });
      await setLikeAction(target, liked);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic.liked}
      aria-label={`${optimistic.liked ? "Unlike" : "Like"} (${optimistic.count} ${optimistic.count === 1 ? "like" : "likes"})`}
      className={`flex items-center gap-1 text-xs ${optimistic.liked ? "font-semibold text-rose-600" : "text-zinc-600 dark:text-zinc-400"}`}
    >
      <span aria-hidden>{optimistic.liked ? "♥" : "♡"}</span>
      <span aria-hidden>{optimistic.count}</span>
    </button>
  );
}
