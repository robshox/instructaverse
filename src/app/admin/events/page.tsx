import { LocalTime } from "@/components/local-time";
import { listGroups } from "@/lib/access";
import { listEvents, utcToZonedInput } from "@/lib/events";
import { requireAdmin } from "@/lib/session";
import { deleteEventAction } from "./actions";
import { EventForm } from "./event-form";

export const metadata = { title: "Events · Admin" };

export default async function AdminEventsPage() {
  await requireAdmin();
  const [events, groups] = await Promise.all([listEvents(), listGroups()]);
  const zones = Intl.supportedValuesOf("timeZone");
  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Events</h1>
      {events.map((e) => (
        <details key={e.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer">
            <span className="font-medium">{e.title}</span>{" "}
            <span className="text-sm text-zinc-500">
              · <LocalTime iso={e.startsAt.toISOString()} fallbackZone={e.timezone} /> · {e.groupIds.length ? `${e.groupIds.length} group(s)` : "Admins only"}
            </span>
          </summary>
          <div className="mt-4 flex flex-col gap-6">
            <EventForm
              groups={groups}
              zones={zones}
              event={{
                id: e.id,
                title: e.title,
                description: e.description,
                startsLocal: utcToZonedInput(e.startsAt, e.timezone),
                endsLocal: e.endsAt ? utcToZonedInput(e.endsAt, e.timezone) : "",
                timezone: e.timezone,
                zoomUrl: e.zoomUrl,
                groupIds: e.groupIds,
              }}
            />
            <form action={deleteEventAction} className="flex flex-wrap items-center gap-3 text-sm">
              <input type="hidden" name="id" value={e.id} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="confirm" value="yes" required />
                Delete &ldquo;{e.title}&rdquo;
              </label>
              <button className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white">Delete event</button>
            </form>
          </div>
        </details>
      ))}
      <section className="flex max-w-2xl flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">New event</h2>
        <EventForm groups={groups} zones={zones} />
      </section>
    </main>
  );
}
