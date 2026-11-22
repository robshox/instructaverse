import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { courseGroups, courses, lessons, modules } from "@/db/schema";
import { mux } from "@/lib/mux";

export class CourseInputError extends Error {}

function required(value: string, what: string) {
  const v = value.trim();
  if (!v) throw new CourseInputError(`Enter a ${what}`);
  return v;
}

// ---- courses ----

export async function updateCourse(id: string, input: { title: string; description: string; groupIds: string[] }) {
  const title = required(input.title, "course title");
  db.transaction((tx) => {
    tx.update(courses).set({ title, description: input.description.trim() }).where(eq(courses.id, id)).run();
    tx.delete(courseGroups).where(eq(courseGroups.courseId, id)).run();
    const groupIds = [...new Set(input.groupIds)];
    if (groupIds.length) tx.insert(courseGroups).values(groupIds.map((groupId) => ({ courseId: id, groupId }))).run();
  });
}

/** Deletes the course with its modules, lessons and progress. Mux assets are left in Mux. */
export async function deleteCourse(id: string) {
  await db.delete(courses).where(eq(courses.id, id));
}

// ---- modules ----

export async function updateModule(id: string, input: { title: string }) {
  await db.update(modules).set({ title: required(input.title, "module title") }).where(eq(modules.id, id));
}

export async function deleteModule(id: string) {
  await db.delete(modules).where(eq(modules.id, id));
}

export async function moveModule(id: string, direction: "up" | "down") {
  const [current] = await db.select().from(modules).where(eq(modules.id, id));
  if (!current) return;
  const [neighbour] = await db
    .select()
    .from(modules)
    .where(
      and(
        eq(modules.courseId, current.courseId),
        direction === "up" ? lt(modules.position, current.position) : gt(modules.position, current.position),
      ),
    )
    .orderBy(direction === "up" ? desc(modules.position) : asc(modules.position))
    .limit(1);
  if (!neighbour) return;
  db.transaction((tx) => {
    tx.update(modules).set({ position: neighbour.position }).where(eq(modules.id, current.id)).run();
    tx.update(modules).set({ position: current.position }).where(eq(modules.id, neighbour.id)).run();
  });
}

// ---- lessons ----

export async function updateLesson(id: string, input: { title: string; bodyMd: string; transcript: string }) {
  await db
    .update(lessons)
    .set({ title: required(input.title, "lesson title"), bodyMd: input.bodyMd, transcript: input.transcript.trim() || null })
    .where(eq(lessons.id, id));
}

export async function deleteLesson(id: string) {
  await db.delete(lessons).where(eq(lessons.id, id));
}

export async function moveLesson(id: string, direction: "up" | "down") {
  const [current] = await db.select().from(lessons).where(eq(lessons.id, id));
  if (!current) return;
  const [neighbour] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.moduleId, current.moduleId),
        direction === "up" ? lt(lessons.position, current.position) : gt(lessons.position, current.position),
      ),
    )
    .orderBy(direction === "up" ? desc(lessons.position) : asc(lessons.position))
    .limit(1);
  if (!neighbour) return;
  db.transaction((tx) => {
    tx.update(lessons).set({ position: neighbour.position }).where(eq(lessons.id, current.id)).run();
    tx.update(lessons).set({ position: current.position }).where(eq(lessons.id, neighbour.id)).run();
  });
}

// ---- video (Mux) ----

/**
 * Start a direct upload: the browser PUTs the file straight to Mux. The asset
 * gets a signed playback policy and carries the lesson ID as passthrough, so
 * the Mux webhook can find the lesson when it's ready (AC-21).
 */
export async function createLessonUpload(lessonId: string): Promise<{ uploadUrl: string }> {
  const upload = await mux.video.uploads.create({
    cors_origin: process.env.BASE_URL!,
    new_asset_settings: { playback_policies: ["signed"], passthrough: lessonId },
  });
  if (!upload.url) throw new Error("Mux didn't return an upload URL");
  await db
    .update(lessons)
    .set({ muxStatus: "preparing", muxAssetId: null, muxPlaybackId: null })
    .where(eq(lessons.id, lessonId));
  return { uploadUrl: upload.url };
}

type MuxAssetLike = {
  id: string;
  status?: string;
  passthrough?: string | null;
  playback_ids?: { id: string; policy: string }[] | null;
};

const signedPlaybackId = (asset: MuxAssetLike) => asset.playback_ids?.find((p) => p.policy === "signed")?.id ?? null;

/** Use an asset that's already in Mux. It must have signed playback, or anyone with the link could watch. */
export async function attachMuxAsset(lessonId: string, assetId: string) {
  const asset = (await mux.video.assets.retrieve(assetId.trim())) as MuxAssetLike;
  const playbackId = signedPlaybackId(asset);
  if (!playbackId) throw new CourseInputError("That asset has no signed playback ID. Add one in Mux, then try again.");
  await db
    .update(lessons)
    .set({ muxAssetId: asset.id, muxPlaybackId: playbackId, muxStatus: asset.status ?? "preparing" })
    .where(eq(lessons.id, lessonId));
}

// ---- Mux webhooks ----

type MuxWebhookEvent = { type: string; data: Record<string, unknown> };

async function lessonForAsset(asset: MuxAssetLike) {
  if (asset.passthrough) {
    const [byPassthrough] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, asset.passthrough));
    if (byPassthrough) return byPassthrough.id;
  }
  const [byAsset] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.muxAssetId, asset.id));
  return byAsset?.id ?? null;
}

/** Apply a verified Mux webhook. Each handler just sets fields, so redelivery is harmless. */
export async function handleMuxEvent(event: MuxWebhookEvent) {
  switch (event.type) {
    case "video.upload.asset_created": {
      const upload = event.data as { asset_id?: string; new_asset_settings?: { passthrough?: string } };
      const lessonId = upload.new_asset_settings?.passthrough;
      if (lessonId && upload.asset_id) {
        await db.update(lessons).set({ muxAssetId: upload.asset_id, muxStatus: "preparing" }).where(eq(lessons.id, lessonId));
      }
      break;
    }
    case "video.asset.ready": {
      const asset = event.data as MuxAssetLike;
      const lessonId = await lessonForAsset(asset);
      if (lessonId) {
        await db
          .update(lessons)
          .set({ muxAssetId: asset.id, muxPlaybackId: signedPlaybackId(asset), muxStatus: signedPlaybackId(asset) ? "ready" : "errored" })
          .where(eq(lessons.id, lessonId));
      }
      break;
    }
    case "video.asset.errored": {
      const asset = event.data as MuxAssetLike;
      const lessonId = await lessonForAsset(asset);
      if (lessonId) await db.update(lessons).set({ muxAssetId: asset.id, muxStatus: "errored" }).where(eq(lessons.id, lessonId));
      break;
    }
    default:
      break;
  }
}
