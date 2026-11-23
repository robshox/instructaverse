import type { VideoCounts, VideoStatus } from "@/lib/courses/admin-summary";

const dot = (color: string) => <span aria-hidden className={`mr-1.5 inline-block size-1.5 rounded-full align-[1px] ${color}`} />;

/** One lesson's video state as a mono tag (FR-9.2). */
export function VideoStatusTag({ status }: { status: VideoStatus }) {
  const map: Record<VideoStatus, React.ReactNode> = {
    ready: <span className="text-ok">✓ READY</span>,
    processing: <span className="text-warn">{dot("bg-warn")}PROCESSING</span>,
    error: <span className="text-danger">{dot("bg-danger")}ERROR</span>,
    none: <span className="text-dim">NO VIDEO</span>,
  };
  return <span className="font-mono text-[11px] tracking-[.04em] whitespace-nowrap">{map[status]}</span>;
}

/** A course's video counts, most urgent first (FR-9.1, AC-27). */
export function VideoSummary({ videos, lessonCount }: { videos: VideoCounts; lessonCount: number }) {
  const parts: React.ReactNode[] = [];
  if (videos.error)
    parts.push(
      <span key="e" className="text-danger">
        {dot("bg-danger")}
        {videos.error} error
      </span>,
    );
  if (videos.processing)
    parts.push(
      <span key="p" className="text-warn">
        {dot("bg-warn")}
        {videos.processing} processing
      </span>,
    );
  if (videos.ready)
    parts.push(
      <span key="r" className="text-ok">
        ✓ {videos.ready} ready
      </span>,
    );
  if (videos.none && videos.none < lessonCount)
    parts.push(
      <span key="n" className="text-dim">
        {videos.none} without video
      </span>,
    );
  if (!parts.length)
    parts.push(
      <span key="none" className="text-dim">
        — no videos
      </span>,
    );
  return <span className="flex flex-col gap-0.5 font-mono text-[13px]">{parts}</span>;
}
