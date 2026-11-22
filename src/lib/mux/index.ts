import Mux from "@mux/mux-node";
import type { Viewer } from "@/lib/access";
import { lessonWithAccess } from "@/lib/courses";
import { lazy } from "@/lib/lazy";

/** Mux API client, created on first use. */
export const mux: Mux = lazy(
  () =>
    new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
      webhookSecret: process.env.MUX_WEBHOOK_SECRET,
    }),
);

export type PlaybackTokens = { playback: string; thumbnail: string; storyboard: string };

/** Lessons are long; tokens only need to outlive one viewing session. */
const TOKEN_LIFETIME = "6h";

/**
 * Signed playback for a lesson's video (AC-18), or null when the viewer has
 * no access or there's no ready video. Assets use a signed playback policy,
 * so a playback ID alone can't be streamed.
 */
export async function playbackFor(viewer: Viewer, lessonId: string): Promise<{ playbackId: string; tokens: PlaybackTokens } | null> {
  const found = await lessonWithAccess(viewer, lessonId);
  const playbackId = found?.lesson.muxPlaybackId;
  if (!found?.allowed || !playbackId || found.lesson.muxStatus !== "ready") return null;

  let signed: Awaited<ReturnType<typeof signAll>>;
  try {
    signed = await signAll(playbackId);
  } catch (e) {
    // Misconfigured signing key: hide the video rather than break the lesson page.
    console.error("[mux] couldn't sign playback; check MUX_SIGNING_KEY_ID and MUX_SIGNING_PRIVATE_KEY", e);
    return null;
  }
  return {
    playbackId,
    tokens: {
      playback: signed["playback-token"]!,
      thumbnail: signed["thumbnail-token"]!,
      storyboard: signed["storyboard-token"]!,
    },
  };
}

function signAll(playbackId: string) {
  return mux.jwt.signPlaybackId(playbackId, {
    keyId: process.env.MUX_SIGNING_KEY_ID,
    keySecret: process.env.MUX_SIGNING_PRIVATE_KEY,
    type: ["video", "thumbnail", "storyboard"],
    expiration: TOKEN_LIFETIME,
  });
}

export function isVtt(text: string | null | undefined): text is string {
  return Boolean(text?.trimStart().startsWith("WEBVTT"));
}

/** The lesson's WebVTT transcript, served as the video's captions (AC-19). Null if no access or not VTT. */
export async function captionsFor(viewer: Viewer, lessonId: string): Promise<string | null> {
  const found = await lessonWithAccess(viewer, lessonId);
  if (!found?.allowed || !isVtt(found.lesson.transcript)) return null;
  return found.lesson.transcript;
}

/** Readable transcript text from WebVTT: drops the header, cue IDs, timings, notes and tags. */
export function vttToText(vtt: string): string {
  const blocks = vtt.replace(/\r\n?/g, "\n").split(/\n{2,}/).slice(1);
  const lines: string[] = [];
  for (const block of blocks) {
    if (/^(NOTE|STYLE|REGION)\b/.test(block)) continue;
    const cue = block.split("\n");
    const timing = cue.findIndex((l) => l.includes("-->"));
    if (timing === -1) continue;
    lines.push(...cue.slice(timing + 1).map((l) => l.replace(/<[^>]+>/g, "").trim()).filter(Boolean));
  }
  return lines.join(" ").replace(/\s+/g, " ").trim();
}
