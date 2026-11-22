import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { comments, user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createBoard } from "@/lib/community/boards";
import { addComment, deleteComment, editComment, listComments } from "@/lib/community/comments";
import { deletePost, editPost, NotAllowedError, pinPost } from "@/lib/community/moderation";
import { createPost, listPosts } from "@/lib/community/posts";
import { pngFile } from "@/test/images";

const admin = { id: "admin", role: "admin" };
const ada = { id: "ada", role: "member" };
const bo = { id: "bo", role: "member" };
const outsider = { id: "out", role: "member" };
let boardId: string;

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "admin", name: "Admin", email: "a@example.com", role: "admin" },
    { id: "ada", name: "Ada", email: "ada@example.com", role: "member" },
    { id: "bo", name: "Bo", email: "bo@example.com", role: "member" },
    { id: "out", name: "Out", email: "out@example.com", role: "member" },
  ]);
  const pro = await createGroup("Pro");
  for (const id of ["ada", "bo"]) await grantMembership({ userId: id, groupId: pro.id, source: "manual", sourceRef: "admin" });
  boardId = (await createBoard({ name: "General", groupIds: [pro.id] })).id;
});

describe("comments", () => {
  it("members with access comment on posts (flat, text only), oldest first", async () => {
    const { id: postId } = await createPost(ada, boardId, { bodyMd: "Hello", images: [] });
    await addComment(bo, postId, "Nice one");
    await addComment(ada, postId, "Thanks!");
    expect((await listComments([postId])).get(postId)?.map((c) => [c.author.name, c.body])).toEqual([
      ["Bo", "Nice one"],
      ["Ada", "Thanks!"],
    ]);
  });

  it("needs text and board access", async () => {
    const { id: postId } = await createPost(ada, boardId, { bodyMd: "Hi", images: [] });
    await expect(addComment(bo, postId, "  ")).rejects.toThrow(/Write a comment/);
    await expect(addComment(outsider, postId, "hi")).rejects.toThrow(/access/);
    await expect(addComment(bo, "missing", "hi")).rejects.toThrow(/access/);
  });
});

describe("AC-24: authors edit and delete their own posts and comments, and only their own", () => {
  it("posts", async () => {
    const { id } = await createPost(ada, boardId, { bodyMd: "Typo", images: [] });
    await editPost(ada, id, "Fixed");
    expect((await listPosts(boardId)).find((p) => p.id === id)?.bodyMd).toBe("Fixed");

    await expect(editPost(bo, id, "Hijacked")).rejects.toBeInstanceOf(NotAllowedError);
    await expect(editPost(admin, id, "Admins delete, they don't rewrite")).rejects.toBeInstanceOf(NotAllowedError);
    await expect(deletePost(bo, id)).rejects.toBeInstanceOf(NotAllowedError);

    await deletePost(ada, id);
    expect((await listPosts(boardId)).find((p) => p.id === id)).toBeUndefined();
  });

  it("comments", async () => {
    const { id: postId } = await createPost(ada, boardId, { bodyMd: "Post", images: [] });
    const c = await addComment(bo, postId, "Frist");
    await editComment(bo, c.id, "First");
    expect((await listComments([postId])).get(postId)?.[0]?.body).toBe("First");
    await expect(editComment(ada, c.id, "nope")).rejects.toBeInstanceOf(NotAllowedError);
    await expect(deleteComment(ada, c.id)).rejects.toBeInstanceOf(NotAllowedError);
    await deleteComment(bo, c.id);
    expect((await listComments([postId])).get(postId) ?? []).toEqual([]);
  });
});

describe("AC-25: admins pin posts and delete anything", () => {
  it("pinning puts a post above unpinned ones; only admins can pin", async () => {
    const { id: older } = await createPost(ada, boardId, { bodyMd: "Read this first", images: [] });
    await createPost(bo, boardId, { bodyMd: "Newer", images: [] });
    await expect(pinPost(ada, older, true)).rejects.toBeInstanceOf(NotAllowedError);
    await pinPost(admin, older, true);
    expect((await listPosts(boardId))[0]).toMatchObject({ id: older, pinned: true });
    await pinPost(admin, older, false);
  });

  it("deleting a post removes its comments and image files", async () => {
    const { id } = await createPost(ada, boardId, { bodyMd: "With picture", images: [pngFile()] });
    await addComment(bo, id, "Great photo");
    const path = (await listPosts(boardId)).find((p) => p.id === id)!.images[0]!.path;
    const file = join(process.env.DATA_DIR!, "uploads", path);
    expect(existsSync(file)).toBe(true);

    await deletePost(admin, id);
    expect((await listPosts(boardId)).find((p) => p.id === id)).toBeUndefined();
    expect(await db.$count(comments, eq(comments.postId, id))).toBe(0); // cascade, no orphan rows
    expect((await listComments([id])).get(id) ?? []).toEqual([]);
    expect(existsSync(file)).toBe(false);
  });

  it("admins delete anyone's comment", async () => {
    const { id: postId } = await createPost(ada, boardId, { bodyMd: "P", images: [] });
    const c = await addComment(bo, postId, "Spam");
    await deleteComment(admin, c.id);
    expect((await listComments([postId])).get(postId) ?? []).toEqual([]);
  });
});
