import { playbackFor } from "@/lib/mux";
import { getViewer } from "@/lib/session";

/** Signed Mux playback for a lesson (AC-18). 403 unless the viewer can see the lesson. */
export async function GET(_request: Request, { params }: RouteContext<"/api/lessons/[id]/playback-token">) {
  const { id } = await params;
  const playback = await playbackFor(await getViewer(), id);
  if (!playback) return Response.json({ error: { code: "forbidden", message: "No access to this video" } }, { status: 403 });
  return Response.json(playback, { headers: { "cache-control": "private, no-store" } });
}
