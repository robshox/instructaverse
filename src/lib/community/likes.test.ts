import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { commentLikes, postLikes, user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createBoard } from "@/lib/community/boards";
import { addComment } from "@/lib/community/comments";
import { likeSummary, setLike } from "@/lib/community/likes";
import { deletePost } from "@/lib/community/moderation";
import { createPost } from "@/lib/community/posts";

const ada = { id: "ada", role: "member" };
const bo = { id: "bo", role: "member" };
const outsider = { id: "out", role: "member" };
let boardId: string;

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "ada", name: "Ada", email: "ada@example.com", role: "member" },
    { id: "bo", name: "Bo", email: "bo@example.com", role: "member" },
    { id: "out", name: "Out", email: "out@example.com", role: "member" },
  ]);
  const pro = await createGroup("Pro");
  for (const id of ["ada", "bo"]) await grantMembership({ userId: id, groupId: pro.id, source: "manual", sourceRef: "admin" });
  boardId = (await createBoard({ name: "General", groupIds: [pro.id] })).id;
});

describe("likes (AC-46)", () => {
  it("liking a post adds 1, unliking takes it back off, and each member counts once", async () => {
    const { id } = await createPost(ada, boardId, { bodyMd: "Like me", images: [] });
    const count = async (viewerId: string) => (await likeSummary(viewerId, [id], [])).posts.get(id);

    expect(await count("ada")).toEqual({ count: 0, liked: false });
    await setLike(bo, { type: "post", id }, true);
    expect(await count("bo")).toEqual({ count: 1, liked: true });
    expect(await count("ada")).toEqual({ count: 1, liked: false });

    await setLike(bo, { type: "post", id }, true); // again: still one like from Bo
    await setLike(ada, { type: "post", id }, true);
    expect(await count("ada")).toEqual({ count: 2, liked: true });

    await setLike(bo, { type: "post", id }, false);
    expect(await count("bo")).toEqual({ count: 1, liked: false });
  });

  it("works on comments too", async () => {
    const { id: postId } = await createPost(ada, boardId, { bodyMd: "P", images: [] });
    const { id } = await addComment(bo, postId, "Comment");
    await setLike(ada, { type: "comment", id }, true);
    expect((await likeSummary("ada", [], [id])).comments.get(id)).toEqual({ count: 1, liked: true });
    await setLike(ada, { type: "comment", id }, false);
    expect((await likeSummary("ada", [], [id])).comments.get(id)).toEqual({ count: 0, liked: false });
  });

  it("needs access to the board", async () => {
    const { id } = await createPost(ada, boardId, { bodyMd: "P", images: [] });
    await expect(setLike(outsider, { type: "post", id }, true)).rejects.toThrow(/access/);
    await expect(setLike(null, { type: "post", id }, true)).rejects.toThrow(/access/);
    await expect(setLike(ada, { type: "comment", id: "missing" }, true)).rejects.toThrow(/access/);
  });

  it("likes go away with the post and its comments", async () => {
    const { id } = await createPost(ada, boardId, { bodyMd: "Gone soon", images: [] });
    const { id: commentId } = await addComment(bo, id, "c");
    await setLike(bo, { type: "post", id }, true);
    await setLike(ada, { type: "comment", id: commentId }, true);
    const before = { p: await db.$count(postLikes), c: await db.$count(commentLikes) };
    await deletePost(ada, id);
    expect({ p: await db.$count(postLikes), c: await db.$count(commentLikes) }).toEqual({ p: before.p - 1, c: before.c - 1 });
  });
});
