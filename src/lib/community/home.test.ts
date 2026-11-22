import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { posts, user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createBoard } from "@/lib/community/boards";
import { addComment } from "@/lib/community/comments";
import { setLike } from "@/lib/community/likes";
import { createPost, latestVisiblePost } from "@/lib/community/posts";
import { createEvent, nextVisibleEvent } from "@/lib/events";

const member = { id: "m1", role: "member" };
const loner = { id: "m2", role: "member" };
let pro: { id: string }, vip: { id: string };

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "m1", name: "Ada Lin", email: "m1@example.com", role: "member" },
    { id: "m2", name: "No Groups", email: "m2@example.com", role: "member" },
    { id: "v1", name: "Vip Person", email: "v1@example.com", role: "member" },
  ]);
  pro = await createGroup("Pro");
  vip = await createGroup("VIP");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
  await grantMembership({ userId: "v1", groupId: vip.id, source: "manual", sourceRef: "admin" });
});

describe("latest visible post (AC-12)", () => {
  it("is the newest post on a board the member can see, with reply and like counts", async () => {
    expect(await latestVisiblePost(member)).toBeNull();
    const general = (await createBoard({ name: "General", groupIds: [pro.id] })).id;
    const secret = (await createBoard({ name: "VIP lounge", groupIds: [vip.id] })).id;
    const older = await createPost(member, general, { bodyMd: "Older post", images: [] });
    await db.update(posts).set({ createdAt: new Date(Date.now() - 60_000) }).where((await import("drizzle-orm")).eq(posts.id, older.id));
    const newer = await createPost(member, general, { bodyMd: "Who else is building agents?", images: [] });
    await addComment(member, newer.id, "Me");
    await setLike(member, { type: "post", id: newer.id }, true);
    await createPost({ id: "v1", role: "member" }, secret, { bodyMd: "VIP only, newest of all", images: [] });

    expect(await latestVisiblePost(member)).toMatchObject({
      id: newer.id,
      bodyMd: "Who else is building agents?",
      boardName: "General",
      author: { name: "Ada Lin" },
      replies: 1,
      likes: 1,
    });
    expect(await latestVisiblePost(loner)).toBeNull();
  });
});

describe("next visible event (AC-12)", () => {
  it("is the soonest upcoming event the member can see", async () => {
    const base = { description: "", endsLocal: "", timezone: "UTC", zoomUrl: "https://zoom.us/j/1" };
    await createEvent({ ...base, title: "VIP dinner", startsLocal: "2030-01-05T10:00", groupIds: [vip.id] });
    await createEvent({ ...base, title: "Later Q&A", startsLocal: "2030-02-01T10:00", groupIds: [pro.id] });
    await createEvent({ ...base, title: "Soon Q&A", startsLocal: "2030-01-10T10:00", groupIds: [pro.id] });
    const now = new Date("2030-01-01T00:00:00Z");
    expect((await nextVisibleEvent(member, now))?.title).toBe("Soon Q&A");
    expect(await nextVisibleEvent(loner, now)).toBeNull();
  });
});
