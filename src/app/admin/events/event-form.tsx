"use client";

import { useActionState, useSyncExternalStore } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form";
import { saveEventAction, type EventFormState } from "./actions";

export type EventFormValues = {
  id: string;
  title: string;
  description: string;
  startsLocal: string;
  endsLocal: string;
  timezone: string;
  zoomUrl: string;
  groupIds: string[];
};

const subscribe = () => () => {};

export function EventForm({ event, groups, zones }: { event?: EventFormValues; groups: { id: string; name: string }[]; zones: string[] }) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(saveEventAction, {});
  // New events default to the admin's own time zone.
  const browserZone = useSyncExternalStore(subscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "UTC");
  const zone = event?.timezone ?? browserZone;

  return (
    <form action={action} key={event ? event.id : `${state.ok}-${zone}`} className="flex flex-col gap-4">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <Field label="Title" name="title" defaultValue={event?.title} required />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea name="description" defaultValue={event?.description} rows={2} className={inputClass} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Starts" name="startsLocal" type="datetime-local" defaultValue={event?.startsLocal} required />
        <Field label="Ends (optional)" name="endsLocal" type="datetime-local" defaultValue={event?.endsLocal} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Time zone
          <select name="timezone" defaultValue={zone} className={inputClass}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Field label="Zoom link" name="zoomUrl" type="url" placeholder="https://zoom.us/j/…" defaultValue={event?.zoomUrl} required />
      <fieldset className="text-sm">
        <legend className="mb-1 font-medium">Who can see it</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2">
              <input type="checkbox" name="groupIds" value={g.id} defaultChecked={event?.groupIds.includes(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
        <p className="mt-1 text-zinc-500">No groups ticked means only admins can see it.</p>
      </fieldset>
      <FormMessage error={state.error} success={event && state.ok ? "Saved." : undefined} />
      <SubmitButton pending={pending} pendingText="Saving…">
        {event ? "Save event" : "Create event"}
      </SubmitButton>
    </form>
  );
}
