import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { listEventsFor, type EventView } from "@/lib/events";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Events</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <EventLists />
      </Suspense>
    </main>
  );
}

async function EventLists() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { upcoming, past } = await listEventsFor(viewer);
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Upcoming</h2>
        {upcoming.length ? (
          <ul className="flex flex-col gap-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} joinable />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No upcoming events.</p>
        )}
      </section>
      {past.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Past</h2>
          <ul className="flex flex-col gap-3 opacity-75">
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function EventCard({ event, joinable }: { event: EventView; joinable?: boolean }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-semibold">{event.title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <LocalTime iso={event.startsAt.toISOString()} fallbackZone={event.timezone} />
        {event.endsAt ? (
          <>
            {" – "}
            <LocalTime iso={event.endsAt.toISOString()} fallbackZone={event.timezone} />
          </>
        ) : null}
      </p>
      {event.description ? <p className="whitespace-pre-wrap text-sm">{event.description}</p> : null}
      {joinable ? (
        <a
          href={event.zoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Join on Zoom
        </a>
      ) : null}
    </li>
  );
}
