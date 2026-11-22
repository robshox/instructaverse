import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { commentLikes, comments, postLikes, posts } from "@/db/schema";
import type { Viewer } from "@/lib/access";
import { assertBoardAccess, NoBoardAccessError } from "./posts";

export type LikeTarget = { type: "post" | "comment"; id: string };
export type LikeState = { count: number; liked: boolean };

async function boardOf(target: LikeTarget): Promise<string | null> {
  if (target.type === "post") {
    const [p] = await db.select({ boardId: posts.boardId }).from(posts).where(eq(posts.id, target.id));
    return p?.boardId ?? null;
  }
  const [c] = await db
    .select({ boardId: posts.boardId })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(eq(comments.id, target.id));
  return c?.boardId ?? null;
}

/** AC-46: like or unlike a post or comment. Idempotent: one like per member per item. */
export async function setLike(viewer: Viewer, target: LikeTarget, liked: boolean): Promise<void> {
  const boardId = await boardOf(target);
  if (!boardId) throw new NoBoardAccessError();
  await assertBoardAccess(viewer, boardId);
  const userId = viewer!.id;
  if (target.type === "post") {
    if (liked) await db.insert(postLikes).values({ userId, postId: target.id }).onConflictDoNothing();
    else await db.delete(postLikes).where(and(eq(postLikes.userId, userId), eq(postLikes.postId, target.id)));
  } else {
    if (liked) await db.insert(commentLikes).values({ userId, commentId: target.id }).onConflictDoNothing();
    else await db.delete(commentLikes).where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, target.id)));
  }
}

/** Like counts, and whether `viewerId` liked each, for a page of posts and comments. */
export async function likeSummary(
  viewerId: string,
  postIds: string[],
  commentIds: string[],
): Promise<{ posts: Map<string, LikeState>; comments: Map<string, LikeState> }> {
  const result = { posts: new Map<string, LikeState>(), comments: new Map<string, LikeState>() };
  for (const id of postIds) result.posts.set(id, { count: 0, liked: false });
  for (const id of commentIds) result.comments.set(id, { count: 0, liked: false });

  if (postIds.length) {
    const [counts, mine] = await Promise.all([
      db.select({ id: postLikes.postId, n: count() }).from(postLikes).where(inArray(postLikes.postId, postIds)).groupBy(postLikes.postId),
      db.select({ id: postLikes.postId }).from(postLikes).where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, viewerId))),
    ]);
    for (const { id, n } of counts) result.posts.get(id)!.count = n;
    for (const { id } of mine) result.posts.get(id)!.liked = true;
  }
  if (commentIds.length) {
    const [counts, mine] = await Promise.all([
      db
        .select({ id: commentLikes.commentId, n: count() })
        .from(commentLikes)
        .where(inArray(commentLikes.commentId, commentIds))
        .groupBy(commentLikes.commentId),
      db
        .select({ id: commentLikes.commentId })
        .from(commentLikes)
        .where(and(inArray(commentLikes.commentId, commentIds), eq(commentLikes.userId, viewerId))),
    ]);
    for (const { id, n } of counts) result.comments.get(id)!.count = n;
    for (const { id } of mine) result.comments.get(id)!.liked = true;
  }
  return result;
}
