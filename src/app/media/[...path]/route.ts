import { getViewer } from "@/lib/session";
import { mediaForViewer } from "@/lib/uploads";

/** Uploaded images, only for members who can see where they were posted (AC-26). */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const file = await mediaForViewer(await getViewer(), path.join("/"));
  // Same response for "missing" and "not allowed", so private images can't be probed.
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
