import { captionsFor } from "@/lib/mux";
import { getViewer } from "@/lib/session";

/** The lesson's WebVTT transcript as a captions track (AC-19), for members with access only. */
export async function GET(_request: Request, { params }: RouteContext<"/api/lessons/[id]/captions">) {
  const { id } = await params;
  const vtt = await captionsFor(await getViewer(), id);
  if (!vtt) return new Response("Not found", { status: 404 });
  return new Response(vtt, { headers: { "content-type": "text/vtt; charset=utf-8", "cache-control": "private, no-store" } });
}
