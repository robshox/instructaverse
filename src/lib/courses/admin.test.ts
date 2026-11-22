import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as muxWebhook } from "@/app/api/webhooks/mux/route";
import { db, migrateDb } from "@/db";
import { lessons } from "@/db/schema";
import { createGroup } from "@/lib/access";
import { createCourse, createLesson, createModule, getCourse, getCourseOutline } from "@/lib/courses";
import {
  attachMuxAsset,
  createLessonUpload,
  deleteCourse,
  deleteLesson,
  deleteModule,
  moveLesson,
  moveModule,
  updateCourse,
  updateLesson,
  updateModule,
} from "@/lib/courses/admin";
import { mux } from "@/lib/mux";
import { muxEvent, signedMuxRequest } from "@/test/mux";

beforeAll(() => migrateDb());
afterEach(() => vi.restoreAllMocks());

const lessonRow = async (id: string) => (await db.select().from(lessons).where(eq(lessons.id, id)))[0]!;

async function setup() {
  const course = await createCourse({ title: "Course", groupIds: [] });
  const mod = await createModule({ courseId: course.id, title: "Module" });
  const lesson = await createLesson({ moduleId: mod.id, title: "Lesson" });
  return { course, mod, lesson };
}

describe("course editor (AC-29)", () => {
  it("updates a course's details and groups", async () => {
    const { course } = await setup();
    const g = await createGroup(`G-${course.id}`);
    await updateCourse(course.id, { title: "Renamed", description: "New", groupIds: [g.id] });
    expect(await getCourse(course.id)).toMatchObject({ title: "Renamed", description: "New", groupIds: [g.id] });
    await expect(updateCourse(course.id, { title: " ", description: "", groupIds: [] })).rejects.toThrow(/title/i);
  });

  it("edits, reorders and deletes modules and lessons", async () => {
    const { course, mod, lesson } = await setup();
    const second = await createLesson({ moduleId: mod.id, title: "Second" });
    const mod2 = await createModule({ courseId: course.id, title: "Module 2" });

    await updateModule(mod.id, { title: "Intro" });
    await updateLesson(lesson.id, { title: "Welcome", bodyMd: "Body", transcript: "WEBVTT\n\n1\n00:00.000 --> 00:01.000\nHi" });
    await moveLesson(second.id, "up");
    await moveModule(mod2.id, "up");

    let outline = await getCourseOutline(course.id);
    expect(outline?.modules.map((m) => [m.title, m.lessons.map((l) => l.title)])).toEqual([
      ["Module 2", []],
      ["Intro", ["Second", "Welcome"]],
    ]);
    expect(await lessonRow(lesson.id)).toMatchObject({ bodyMd: "Body", transcript: expect.stringContaining("WEBVTT") });

    await moveLesson(second.id, "up"); // already first: no change
    await deleteLesson(second.id);
    await deleteModule(mod2.id);
    outline = await getCourseOutline(course.id);
    expect(outline?.modules.map((m) => [m.title, m.lessons.map((l) => l.title)])).toEqual([["Intro", ["Welcome"]]]);

    await deleteCourse(course.id);
    expect(await getCourse(course.id)).toBeNull();
  });
});

describe("video upload to Mux (AC-21)", () => {
  it("creates a direct upload with signed playback, tagged with the lesson", async () => {
    const { lesson } = await setup();
    const create = vi
      .spyOn(mux.video.uploads, "create")
      .mockResolvedValue({ id: "upload_1", url: "https://storage.mux.com/up/1" } as never);
    expect(await createLessonUpload(lesson.id)).toEqual({ uploadUrl: "https://storage.mux.com/up/1" });
    expect(create).toHaveBeenCalledWith({
      cors_origin: "http://localhost:3000",
      new_asset_settings: { playback_policies: ["signed"], passthrough: lesson.id },
    });
    expect(await lessonRow(lesson.id)).toMatchObject({ muxStatus: "preparing", muxAssetId: null, muxPlaybackId: null });
  });

  it("the asset.ready webhook makes the lesson playable", async () => {
    const { lesson } = await setup();
    await muxWebhook(signedMuxRequest(muxEvent("video.upload.asset_created", { id: "upload_2", asset_id: "asset_2", new_asset_settings: { passthrough: lesson.id } })));
    expect(await lessonRow(lesson.id)).toMatchObject({ muxAssetId: "asset_2", muxStatus: "preparing" });

    const res = await muxWebhook(
      signedMuxRequest(
        muxEvent("video.asset.ready", {
          id: "asset_2",
          status: "ready",
          passthrough: lesson.id,
          playback_ids: [{ id: "public_pb", policy: "public" }, { id: "signed_pb", policy: "signed" }],
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(await lessonRow(lesson.id)).toMatchObject({ muxAssetId: "asset_2", muxPlaybackId: "signed_pb", muxStatus: "ready" });
  });

  it("records an errored asset so the admin can see it", async () => {
    const { lesson } = await setup();
    await muxWebhook(signedMuxRequest(muxEvent("video.asset.errored", { id: "asset_3", status: "errored", passthrough: lesson.id })));
    expect(await lessonRow(lesson.id)).toMatchObject({ muxStatus: "errored" });
  });

  it("rejects unsigned or wrongly signed webhooks", async () => {
    const { lesson } = await setup();
    const event = muxEvent("video.asset.ready", { id: "a", status: "ready", passthrough: lesson.id, playback_ids: [{ id: "x", policy: "signed" }] });
    expect((await muxWebhook(signedMuxRequest(event, "wrong"))).status).toBe(400);
    expect((await muxWebhook(new Request("http://localhost/api/webhooks/mux", { method: "POST", body: JSON.stringify(event) }))).status).toBe(400);
    expect((await lessonRow(lesson.id)).muxStatus).toBeNull();
  });

  it("attaching an existing asset uses its signed playback ID", async () => {
    const { lesson } = await setup();
    vi.spyOn(mux.video.assets, "retrieve").mockResolvedValue({
      id: "asset_4",
      status: "ready",
      playback_ids: [{ id: "signed_4", policy: "signed" }],
    } as never);
    await attachMuxAsset(lesson.id, "asset_4");
    expect(await lessonRow(lesson.id)).toMatchObject({ muxAssetId: "asset_4", muxPlaybackId: "signed_4", muxStatus: "ready" });
  });

  it("refuses to attach an asset with only public playback (it could be watched by anyone)", async () => {
    const { lesson } = await setup();
    vi.spyOn(mux.video.assets, "retrieve").mockResolvedValue({ id: "a5", status: "ready", playback_ids: [{ id: "p", policy: "public" }] } as never);
    await expect(attachMuxAsset(lesson.id, "a5")).rejects.toThrow(/signed playback/i);
  });
});
