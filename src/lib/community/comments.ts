import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { comments, posts, user } from "@/db/schema";
import type { Viewer } from "@/lib/access";
import { NotAllowedError } from "./moderation";
import { assertBoardAccess, NoBoardAccessError, PostInputError } from "./posts";

export type CommentView = {
  id: string;
  postId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; image: string | null };
};

function cleanBody(body: string) {
  const text = body.trim();
  if (!text) throw new PostInputError("Write a comment first");
  return text;
}

export async function addComment(viewer: Viewer, postId: string, body: string): Promise<{ id: string }> {
  const [post] = await db.select({ boardId: posts.boardId }).from(posts).where(eq(posts.id, postId));
  if (!post) throw new NoBoardAccessError();
  await assertBoardAccess(viewer, post.boardId);
  const text = cleanBody(body);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(comments).values({ id, postId, authorId: viewer!.id, body: text, createdAt: now, updatedAt: now });
  return { id };
}

async function ownComment(viewer: Viewer, commentId: string, { adminMay }: { adminMay: boolean }) {
  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
  const isAuthor = Boolean(viewer && comment && comment.authorId === viewer.id);
  if (!comment || !(isAuthor || (adminMay && viewer?.role === "admin"))) throw new NotAllowedError();
  return comment;
}

/** AC-24: authors edit their own comments. */
export async function editComment(viewer: Viewer, commentId: string, body: string) {
  await ownComment(viewer, commentId, { adminMay: false });
  await db.update(comments).set({ body: cleanBody(body), updatedAt: new Date() }).where(eq(comments.id, commentId));
}

/** AC-24/AC-25: authors delete their own comments; admins delete any. */
export async function deleteComment(viewer: Viewer, commentId: string) {
  await ownComment(viewer, commentId, { adminMay: true });
  await db.delete(comments).where(eq(comments.id, commentId));
}

/** Comments for several posts, oldest first, keyed by post ID. */
export async function listComments(postIds: string[]): Promise<Map<string, CommentView[]>> {
  const byPost = new Map<string, CommentView[]>();
  if (!postIds.length) return byPost;
  const rows = await db
    .select({ comment: comments, author: { id: user.id, name: user.name, image: user.image } })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.authorId))
    .where(inArray(comments.postId, postIds))
    .orderBy(asc(comments.createdAt));
  for (const { comment, author } of rows) {
    const list = byPost.get(comment.postId) ?? [];
    list.push({ id: comment.id, postId: comment.postId, body: comment.body, createdAt: comment.createdAt, updatedAt: comment.updatedAt, author });
    byPost.set(comment.postId, list);
  }
  return byPost;
}
