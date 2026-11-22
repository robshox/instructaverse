import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { DateBlock, DaysAwayBadge, LocalTimeRange, ViewerZoneName } from "@/components/local-time";
import { Card, Eyebrow, pillClass } from "@/components/ui";
import { listGroups } from "@/lib/access";
import { eventEnd, listEventsFor, type EventView } from "@/lib/events";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Events" };

/** Events (FR-7, AC-20, AC-21). */
export default function EventsPage() {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <EventLists />
      </Suspense>
    </main>
  );
}

function duration(e: EventView) {
  const minutes = Math.round((eventEnd(e).getTime() - e.startsAt.getTime()) / 60_000);
  if (minutes < 60 || minutes % 60) return `${minutes} min`;
  return `${minutes / 60} h`;
}

async function EventLists() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const [{ upcoming, past }, groups] = await Promise.all([listEventsFor(viewer), listGroups()]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const audience = (e: EventView) => e.groupIds.map((id) => groupName.get(id)).filter(Boolean).join(", ") || "Admins only";
  const fallbackZone = upcoming[0]?.timezone ?? past[0]?.timezone ?? "UTC";

  return (
    <>
      <Eyebrow>
        Community <b className="font-normal text-accent">·</b> Live
      </Eyebrow>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-[44px] leading-[1.05] font-medium tracking-[-.04em]">Events</h1>
        <p className="font-mono text-xs text-muted">
          Times shown in your time zone{" "}
          <span className="text-fg">
            · <ViewerZoneName fallbackZone={fallbackZone} />
          </span>
        </p>
      </div>

      <section className="mt-9">
        <Eyebrow className="mb-3.5">
          Upcoming <b className="font-normal text-accent">·</b> {upcoming.length}
        </Eyebrow>
        {upcoming.length ? (
          <ul className="flex flex-col gap-3.5">
            {upcoming.map((e, i) => {
              const startIso = e.startsAt.toISOString();
              return (
                <li key={e.id} className={`rounded-md border bg-surface ${i === 0 ? "border-line-strong" : "border-line"}`}>
                  <div className="flex items-start gap-6 p-6">
                    <DateBlock iso={startIso} fallbackZone={e.timezone} weekday size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-medium tracking-[-.03em]">{e.title}</h2>
                        <DaysAwayBadge iso={startIso} fallbackZone={e.timezone} />
                      </div>
                      <p className="mt-1.5 font-mono text-[13px] text-muted">
                        <LocalTimeRange startIso={startIso} endIso={e.endsAt?.toISOString()} fallbackZone={e.timezone} /> · {duration(e)} · Zoom ·{" "}
                        {audience(e)}
                      </p>
                      {e.description ? <p className="mt-3 max-w-[620px] whitespace-pre-wrap text-[#d6d6d6]">{e.description}</p> : null}
                      <div className="mt-[18px] flex flex-wrap gap-2.5">
                        <a href={e.zoomUrl} target="_blank" rel="noopener noreferrer" className={pillClass("primary")}>
                          <Icon name="video" size={16} /> Join on Zoom
                        </a>
                        <a href={`/api/events/${e.id}/calendar`} download className={pillClass("secondary")}>
                          <Icon name="calendar-plus" size={16} /> Add to calendar
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="p-6 text-muted">No upcoming events.</Card>
        )}
      </section>

      {past.length ? (
        <section className="mt-11">
          <Eyebrow className="mb-3.5">Past</Eyebrow>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            {past.map((e) => (
              <li key={e.id} className="flex items-center gap-6 px-6 py-4">
                <DateBlock iso={e.startsAt.toISOString()} fallbackZone={e.timezone} muted />
                <div className="flex-1">
                  <h3 className="text-[17px] font-medium tracking-[-.02em] text-[#d6d6d6]">{e.title}</h3>
                  <p className="font-mono text-xs text-dim">
                    <LocalTimeRange startIso={e.startsAt.toISOString()} fallbackZone={e.timezone} /> · {duration(e)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
