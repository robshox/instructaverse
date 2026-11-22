"use client";

import MuxPlayer from "@mux/mux-player-react";
import type { PlaybackTokens } from "@/lib/mux";

/** Signed Mux playback, with the lesson's WebVTT transcript as captions when available (AC-19). */
export function LessonPlayer({
  playbackId,
  tokens,
  title,
  captionsSrc,
}: {
  playbackId: string;
  tokens: PlaybackTokens;
  title: string;
  captionsSrc: string | null;
}) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      tokens={tokens}
      streamType="on-demand"
      metadata={{ video_title: title }}
      accentColor="#18181b"
      className="aspect-video w-full overflow-hidden rounded-md border border-line bg-black"
    >
      {captionsSrc ? <track kind="captions" src={captionsSrc} srcLang="en" label="English" default /> : null}
    </MuxPlayer>
  );
}
