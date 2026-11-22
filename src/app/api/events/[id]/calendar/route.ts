import { getBrand } from "@/lib/brand";
import { calendarFor } from "@/lib/events/ics";
import { getViewer } from "@/lib/session";

/** Add to calendar (FR-7.2, AC-21): a single-event .ics, for members who can see the event; 404 otherwise. */
export async function GET(_request: Request, { params }: RouteContext<"/api/events/[id]/calendar">) {
  const { id } = await params;
  const ics = await calendarFor(await getViewer(), id, getBrand().name);
  if (!ics) return new Response("Not found", { status: 404 });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="event-${id.replace(/[^\w-]/g, "")}.ics"`,
      "cache-control": "private, no-store",
    },
  });
}
