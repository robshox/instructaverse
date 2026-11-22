import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postImages, posts } from "@/db/schema";
import type { Viewer } from "@/lib/access";
import { removeStored } from "@/lib/uploads";
import { PostInputError, setPinned } from "./posts";

export class NotAllowedError extends Error {
  constructor() {
    super("You can't do that");
    this.name = "NotAllowedError";
  }
}

const isAdmin = (viewer: Viewer) => viewer?.role === "admin";

async function postFor(viewer: Viewer, postId: string, { adminMay }: { adminMay: boolean }) {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId));
  const isAuthor = Boolean(viewer && post && post.authorId === viewer.id);
  if (!post || !(isAuthor || (adminMay && isAdmin(viewer)))) throw new NotAllowedError();
  return post;
}

/** AC-24: only the author edits a post (admins can delete it, not rewrite it). */
export async function editPost(viewer: Viewer, postId: string, bodyMd: string) {
  await postFor(viewer, postId, { adminMay: false });
  const text = bodyMd.trim();
  if (!text) throw new PostInputError("Write something to post");
  await db.update(posts).set({ bodyMd: text, updatedAt: new Date() }).where(eq(posts.id, postId));
}

/** AC-24/AC-25: the author or an admin deletes a post, with its comments and image files. */
export async function deletePost(viewer: Viewer, postId: string) {
  await postFor(viewer, postId, { adminMay: true });
  const images = await db.select({ path: postImages.path }).from(postImages).where(eq(postImages.postId, postId));
  await db.delete(posts).where(eq(posts.id, postId)); // comments and image rows cascade
  removeStored(images.map((i) => i.path));
}

/** AC-25: admins pin and unpin posts. */
export async function pinPost(viewer: Viewer, postId: string, pinned: boolean) {
  if (!isAdmin(viewer)) throw new NotAllowedError();
  await setPinned(postId, pinned);
}
