import { Icon } from "@/components/icon";
import { Card, Eyebrow, pillClass, Tag } from "@/components/ui";
import { listGroups } from "@/lib/access";
import { eventEnd, listEvents, utcToZonedInput, type EventView } from "@/lib/events";
import { requireAdmin } from "@/lib/session";
import { deleteEventAction } from "./actions";
import { EventForm } from "./event-form";

export const metadata = { title: "Events · Admin" };

const inZone = (d: Date, zone: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en", { timeZone: zone, ...options }).format(d);

/** Admin events (FR-9.8): upcoming and past lists beside the create form. Times are in the organiser's zone. */
export default async function AdminEventsPage() {
  await requireAdmin();
  const [events, groups] = await Promise.all([listEvents(), listGroups()]);
  const zones = Intl.supportedValuesOf("timeZone");
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const now = new Date();
  const upcoming = events.filter((e) => eventEnd(e) > now);
  const past = events.filter((e) => eventEnd(e) <= now).reverse();

  function Row({ e, muted }: { e: EventView; muted?: boolean }) {
    return (
      <li className="border-b border-line px-5 py-4 last:border-0">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-4 [&::-webkit-details-marker]:hidden">
            <div className={`w-14 shrink-0 rounded-md border py-1.5 text-center font-mono leading-tight ${muted ? "border-line" : "border-line-strong"}`}>
              <div className={`text-[11px] ${muted ? "text-dim" : "text-accent"}`}>{inZone(e.startsAt, e.timezone, { month: "short" }).toUpperCase()}</div>
              <div className="text-xl">{inZone(e.startsAt, e.timezone, { day: "2-digit" })}</div>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${muted ? "text-[#d6d6d6]" : ""}`}>{e.title}</p>
              <p className="font-mono text-xs text-dim">
                {inZone(e.startsAt, e.timezone, { weekday: "short", hour: "numeric", minute: "2-digit" })} · {e.timezone}
              </p>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {e.groupIds.length ? e.groupIds.map((id) => <Tag key={id}>{groupName.get(id) ?? "Unknown group"}</Tag>) : <Tag tone="dim">Admins only</Tag>}
              </span>
            </div>
            <span className={pillClass("secondary", "sm")}>
              <Icon name="pencil" size={13} /> Edit
            </span>
          </summary>
          <div className="mt-4 flex flex-col gap-5 border-t border-line pt-4">
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
            <form action={deleteEventAction} className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <input type="hidden" name="id" value={e.id} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="confirm" value="yes" required />
                Delete &ldquo;{e.title}&rdquo;
              </label>
              <button className={pillClass("danger", "sm")}>Delete event</button>
            </form>
          </div>
        </details>
      </li>
    );
  }

  return (
    <main className="flex flex-col gap-7">
      <div>
        <Eyebrow>
          Admin <b className="font-normal text-accent">·</b> Community
        </Eyebrow>
        <h1 className="mt-2 text-[34px] leading-[1.1] font-medium tracking-[-.035em]">Events</h1>
        <p className="mt-1.5 text-sm text-muted">Times show in each event&rsquo;s own time zone; members see them in theirs.</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section>
            <Eyebrow className="mb-3">
              Upcoming <b className="font-normal text-accent">·</b> {upcoming.length}
            </Eyebrow>
            <Card className="overflow-hidden">
              {upcoming.length ? (
                <ul>
                  {upcoming.map((e) => (
                    <Row key={e.id} e={e} />
                  ))}
                </ul>
              ) : (
                <p className="p-5 text-muted">No upcoming events.</p>
              )}
            </Card>
          </section>
          {past.length ? (
            <section>
              <Eyebrow className="mb-3">Past</Eyebrow>
              <Card className="overflow-hidden">
                <ul>
                  {past.map((e) => (
                    <Row key={e.id} e={e} muted />
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </div>
        <Card className="flex flex-col gap-4 p-5">
          <Eyebrow accent="New event" />
          <EventForm groups={groups} zones={zones} />
        </Card>
      </div>
    </main>
  );
}
