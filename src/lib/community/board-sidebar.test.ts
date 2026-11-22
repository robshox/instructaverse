import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { boardsWithCounts, createBoard } from "@/lib/community/boards";
import { createPost, listPosts } from "@/lib/community/posts";

const member = { id: "m1", role: "member" };
const admin = { id: "a1", role: "admin" };
let general: string, wins: string, vipBoard: string;

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "m1", name: "Ada Lin", email: "m1@example.com", role: "member" },
    { id: "a1", name: "Host Person", email: "a1@example.com", role: "admin" },
  ]);
  const pro = await createGroup("Pro");
  const vip = await createGroup("VIP");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
  general = (await createBoard({ name: "General", groupIds: [pro.id] })).id;
  wins = (await createBoard({ name: "Wins", groupIds: [pro.id] })).id;
  vipBoard = (await createBoard({ name: "VIP lounge", groupIds: [vip.id] })).id;
  await createPost(member, general, { bodyMd: "one", images: [] });
  await createPost(admin, general, { bodyMd: "two", images: [] });
  await createPost(admin, vipBoard, { bodyMd: "secret", images: [] });
});

describe("board sidebar (AC-18)", () => {
  it("lists only visible boards, each with its post count", async () => {
    const boards = await boardsWithCounts(member);
    expect(boards.map((b) => [b.id, b.name, b.postCount])).toEqual([
      [general, "General", 2],
      [wins, "Wins", 0],
    ]);
  });
});

describe("post author role (AC-19)", () => {
  it("is returned so admin posts can show a HOST tag", async () => {
    const posts = await listPosts(general);
    expect(posts.map((p) => [p.bodyMd, p.author.role]).sort()).toEqual([
      ["one", "member"],
      ["two", "admin"],
    ]);
  });
});
