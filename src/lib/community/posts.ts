import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { postImages, posts, user } from "@/db/schema";
import { canAccess, type Viewer } from "@/lib/access";
import { checkImages, removeStored, storeImages, UploadError } from "@/lib/uploads";
import { getBoard } from "./boards";

export class PostInputError extends Error {}
export class NoBoardAccessError extends Error {
  constructor() {
    super("You don't have access to this board");
  }
}

export type PostView = {
  id: string;
  boardId: string;
  bodyMd: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; image: string | null };
  images: { id: string; path: string; contentType: string }[];
};

export async function assertBoardAccess(viewer: Viewer, boardId: string) {
  const board = await getBoard(boardId);
  if (!viewer || !board || !(await canAccess(viewer, board.groupIds))) throw new NoBoardAccessError();
  return board;
}

/** AC-22/AC-23: a text post with up to 4 images. Nothing is saved if any part is invalid. */
export async function createPost(viewer: Viewer, boardId: string, input: { bodyMd: string; images: File[] }) {
  await assertBoardAccess(viewer, boardId);
  const bodyMd = input.bodyMd.trim();
  if (!bodyMd) throw new PostInputError("Write something to post");
  let images;
  try {
    images = await checkImages(input.images);
  } catch (e) {
    if (e instanceof UploadError) throw new PostInputError(e.message);
    throw e;
  }

  const id = crypto.randomUUID();
  const paths = storeImages("posts", images);
  try {
    const now = new Date();
    db.transaction((tx) => {
      tx.insert(posts).values({ id, boardId, authorId: viewer!.id, bodyMd, createdAt: now, updatedAt: now }).run();
      if (paths.length) {
        tx.insert(postImages)
          .values(paths.map((path, position) => ({ id: crypto.randomUUID(), postId: id, path, contentType: images[position]!.contentType, position })))
          .run();
      }
    });
  } catch (e) {
    removeStored(paths);
    throw e;
  }
  return { id };
}

export async function setPinned(postId: string, pinned: boolean) {
  await db.update(posts).set({ pinned }).where(eq(posts.id, postId));
}

/** Pinned posts first, then newest first (FR-5.4). */
export async function listPosts(boardId: string): Promise<PostView[]> {
  const rows = await db
    .select({ post: posts, author: { id: user.id, name: user.name, image: user.image } })
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .where(eq(posts.boardId, boardId))
    .orderBy(desc(posts.pinned), desc(posts.createdAt));
  if (!rows.length) return [];
  const imgs = await db
    .select()
    .from(postImages)
    .where(inArray(postImages.postId, rows.map((r) => r.post.id)))
    .orderBy(asc(postImages.position));
  return rows.map(({ post, author }) => ({
    id: post.id,
    boardId: post.boardId,
    bodyMd: post.bodyMd,
    pinned: post.pinned,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author,
    images: imgs.filter((i) => i.postId === post.id).map(({ id, path, contentType }) => ({ id, path, contentType })),
  }));
}
