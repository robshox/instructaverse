import { createVerify, generateKeyPairSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db, migrateDb } from "@/db";
import { lessons, user } from "@/db/schema";
import { createGroup, grantMembership } from "@/lib/access";
import { createCourse, createLesson, createModule } from "@/lib/courses";
import { captionsFor, isVtt, playbackFor, vttToText } from "@/lib/mux";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.MUX_SIGNING_KEY_ID = "signing-key-1";
process.env.MUX_SIGNING_PRIVATE_KEY = Buffer.from(privateKey.export({ type: "pkcs1", format: "pem" })).toString("base64");

const VTT = "WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nHi <b>everyone</b>,\n\n2\n00:00:02.000 --> 00:00:04.000\nwelcome to the course.\n";

const member = { id: "m1", role: "member" };
const outsider = { id: "m2", role: "member" };
let lessonId: string;
let noVideoLessonId: string;

/** Verify an RS256 JWT with the test public key and return its claims. */
function verify(token: string) {
  const [header, payload, signature] = token.split(".");
  const ok = createVerify("RSA-SHA256").update(`${header}.${payload}`).verify(publicKey, Buffer.from(signature!, "base64url"));
  expect(ok).toBe(true);
  return { header: JSON.parse(Buffer.from(header!, "base64url").toString()), claims: JSON.parse(Buffer.from(payload!, "base64url").toString()) };
}

beforeAll(async () => {
  migrateDb();
  await db.insert(user).values([
    { id: "m1", name: "M", email: "m1@example.com", role: "member" },
    { id: "m2", name: "O", email: "m2@example.com", role: "member" },
  ]);
  const pro = await createGroup("Pro");
  await grantMembership({ userId: "m1", groupId: pro.id, source: "manual", sourceRef: "admin" });
  const course = await createCourse({ title: "C", groupIds: [pro.id] });
  const mod = await createModule({ courseId: course.id, title: "M" });
  lessonId = (await createLesson({ moduleId: mod.id, title: "L", transcript: VTT })).id;
  await db.update(lessons).set({ muxPlaybackId: "PLAYBACK123", muxStatus: "ready" }).where(eq(lessons.id, lessonId));
  noVideoLessonId = (await createLesson({ moduleId: mod.id, title: "Text only", transcript: "plain transcript" })).id;
});

describe("signed playback (AC-18)", () => {
  it("signs short-lived video, thumbnail and storyboard tokens for members with access", async () => {
    const playback = await playbackFor(member, lessonId);
    expect(playback?.playbackId).toBe("PLAYBACK123");
    const { header, claims } = verify(playback!.tokens.playback);
    expect(header).toMatchObject({ alg: "RS256" });
    // Mux reads the signing key ID from the claims.
    expect(claims).toMatchObject({ sub: "PLAYBACK123", aud: "v", kid: "signing-key-1" });
    expect(claims.exp - Date.now() / 1000).toBeLessThanOrEqual(6 * 3600 + 5);
    expect(verify(playback!.tokens.thumbnail).claims.aud).toBe("t");
    expect(verify(playback!.tokens.storyboard).claims.aud).toBe("s");
  });

  it("refuses members without access and signed-out visitors (no token is issued)", async () => {
    expect(await playbackFor(outsider, lessonId)).toBeNull();
    expect(await playbackFor(null, lessonId)).toBeNull();
  });

  it("a broken signing key hides the video instead of failing the lesson page", async () => {
    const good = process.env.MUX_SIGNING_PRIVATE_KEY;
    process.env.MUX_SIGNING_PRIVATE_KEY = "not-a-key";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await playbackFor(member, lessonId)).toBeNull();
      expect(log).toHaveBeenCalled();
    } finally {
      process.env.MUX_SIGNING_PRIVATE_KEY = good;
      log.mockRestore();
    }
  });

  it("returns nothing for lessons without a ready video", async () => {
    expect(await playbackFor(member, noVideoLessonId)).toBeNull();
    expect(await playbackFor(member, "missing")).toBeNull();
  });
});

describe("captions (AC-19)", () => {
  it("serves a WebVTT transcript as captions to members with access only", async () => {
    expect(await captionsFor(member, lessonId)).toBe(VTT);
    expect(await captionsFor(outsider, lessonId)).toBeNull();
  });

  it("has no captions for plain-text transcripts", async () => {
    expect(await captionsFor(member, noVideoLessonId)).toBeNull();
  });

  it("turns WebVTT into readable transcript text", () => {
    expect(isVtt(VTT)).toBe(true);
    expect(isVtt("plain transcript")).toBe(false);
    expect(vttToText(VTT)).toBe("Hi everyone, welcome to the course.");
  });
});
