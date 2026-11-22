import { readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { postImages, posts, user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createBoard, ensureDefaultBoard, listBoardsFor } from "@/lib/community/boards";
import { createPost, listPosts, PostInputError, setPinned } from "@/lib/community/posts";
import { mediaForViewer } from "@/lib/uploads";
import { fakePng, gifFile, hugePng, pngFile } from "@/test/images";

const admin = { id: "admin", role: "admin" };
const member = { id: "m1", role: "member" };
const outsider = { id: "m2", role: "member" };
let boardId: string;

const uploadDir = () => join(process.env.DATA_DIR!, "uploads", "posts");
const filesOnDisk = () => {
  try {
    return readdirSync(uploadDir()).length;
  } catch {
    return 0;
  }
};

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "admin", name: "Admin", email: "a@example.com", role: "admin" },
    { id: "m1", name: "Ada", email: "m1@example.com", role: "member" },
    { id: "m2", name: "Out", email: "m2@example.com", role: "member" },
  ]);
  await ensureDefaultBoard(); // what startup does on a fresh install
  const pro = await createGroup("Pro");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
  boardId = (await createBoard({ name: "Wins", groupIds: [pro.id] })).id;
});

describe("boards", () => {
  it("a default General board exists (admin-only until groups are added)", async () => {
    await ensureDefaultBoard(); // boards exist now: adds nothing
    expect((await listBoardsFor(admin)).filter((b) => b.name === "General")).toHaveLength(1);
    expect((await listBoardsFor(admin)).map((b) => b.name)).toEqual(expect.arrayContaining(["General", "Wins"]));
    expect((await listBoardsFor(member)).map((b) => b.name)).toEqual(["Wins"]);
    expect(await listBoardsFor(outsider)).toEqual([]);
  });
});

describe("posting (AC-22, AC-23)", () => {
  it("AC-22: a post with text and up to 4 valid images appears at the top for members with access", async () => {
    await createPost(member, boardId, { bodyMd: "First!", images: [] });
    const created = await createPost(member, boardId, {
      bodyMd: "Shipped my **first agent**",
      images: [pngFile(), gifFile(), pngFile("b.png"), pngFile("c.png")],
    });
    const list = await listPosts(boardId);
    expect(list[0]).toMatchObject({
      id: created.id,
      bodyMd: "Shipped my **first agent**",
      author: { name: "Ada" },
      images: [
        expect.objectContaining({ contentType: "image/png" }),
        expect.objectContaining({ contentType: "image/gif" }),
        expect.anything(),
        expect.anything(),
      ],
    });
    expect(list.map((p) => p.bodyMd)).toEqual(["Shipped my **first agent**", "First!"]);
  });

  it("pinned posts show above newer ones", async () => {
    const old = (await listPosts(boardId)).at(-1)!;
    await setPinned(old.id, true);
    expect((await listPosts(boardId))[0]!.id).toBe(old.id);
    await setPinned(old.id, false);
  });

  it("AC-23: rejects an image over 10 MB, a fifth image, or a non-image, saving nothing", async () => {
    const before = { posts: await db.$count(posts), images: await db.$count(postImages), files: filesOnDisk() };
    await expect(createPost(member, boardId, { bodyMd: "x", images: [hugePng()] })).rejects.toThrow(/10 MB/);
    await expect(
      createPost(member, boardId, { bodyMd: "x", images: [pngFile(), pngFile(), pngFile(), pngFile(), pngFile()] }),
    ).rejects.toThrow(/up to 4/);
    await expect(createPost(member, boardId, { bodyMd: "x", images: [pngFile(), fakePng()] })).rejects.toThrow(
      /JPEG, PNG, WebP or GIF/,
    );
    expect({ posts: await db.$count(posts), images: await db.$count(postImages), files: filesOnDisk() }).toEqual(before);
  });

  it("requires text, and access to the board", async () => {
    await expect(createPost(member, boardId, { bodyMd: "   ", images: [] })).rejects.toBeInstanceOf(PostInputError);
    await expect(createPost(outsider, boardId, { bodyMd: "hi", images: [] })).rejects.toThrow(/access/);
    await expect(createPost(null, boardId, { bodyMd: "hi", images: [] })).rejects.toThrow(/access/);
  });
});

describe("protected media (AC-26)", () => {
  it("serves a board image to members with access only", async () => {
    const { images } = (await listPosts(boardId))[0]!;
    const path = images[0]!.path;
    const file = await mediaForViewer(member, path);
    expect(file?.contentType).toBe("image/png");
    expect(file?.data.byteLength).toBeGreaterThan(0);
    expect(await mediaForViewer(outsider, path)).toBeNull();
    expect(await mediaForViewer(null, path)).toBeNull();
  });

  it("never serves files that aren't post images (no path tricks)", async () => {
    for (const path of ["../app.db", "posts/../../app.db", "posts/missing.png", "/etc/passwd"]) {
      expect(await mediaForViewer(admin, path)).toBeNull();
    }
  });
});
