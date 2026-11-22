"use client";

import { useOptimistic, useTransition } from "react";
import { setLikeAction } from "@/app/(member)/board/actions";
import { Icon } from "@/components/icon";
import type { LikeState, LikeTarget } from "@/lib/community/likes";

/** Like / unlike with an optimistic count (AC-46). */
export function LikeButton({ target, state, size = 15 }: { target: LikeTarget; state: LikeState; size?: number }) {
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
      className={`inline-flex items-center gap-1.5 font-mono text-xs hover:text-fg ${optimistic.liked ? "text-fg" : "text-muted"}`}
    >
      <span className={optimistic.liked ? "text-accent [&_svg]:fill-current" : ""}>
        <Icon name="heart" size={size} />
      </span>
      <span aria-hidden>{optimistic.count}</span>
    </button>
  );
}
