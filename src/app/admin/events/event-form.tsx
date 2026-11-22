"use client";

import { useActionState, useSyncExternalStore } from "react";
import { Field, FormMessage, inputClass, labelClass, SubmitButton } from "@/components/form";
import { ChipCheckbox } from "@/components/ui";
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
  const browserZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
  const zone = event?.timezone ?? browserZone;

  return (
    <form action={action} key={event ? event.id : `${state.ok}-${zone}`} className="flex flex-col gap-4">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <Field label="Title" name="title" defaultValue={event?.title} required />
      <label className={labelClass}>
        Description
        <textarea name="description" defaultValue={event?.description} rows={3} className={`${inputClass} font-sans text-[15px] tracking-normal normal-case`} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" name="startsLocal" type="datetime-local" defaultValue={event?.startsLocal} required />
        <Field label="Ends (optional)" name="endsLocal" type="datetime-local" defaultValue={event?.endsLocal} />
        <label className={`${labelClass} sm:col-span-2`}>
          Time zone
          <select name="timezone" defaultValue={zone} className={`${inputClass} font-sans text-[15px] tracking-normal normal-case`}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Field label="Zoom link" name="zoomUrl" type="url" placeholder="https://zoom.us/j/…" defaultValue={event?.zoomUrl} required />
      <fieldset>
        <legend className={`${labelClass} mb-2`}>Who can see it</legend>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <ChipCheckbox key={g.id} name="groupIds" value={g.id} defaultChecked={event?.groupIds.includes(g.id)}>
              {g.name}
            </ChipCheckbox>
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-dim">None selected = admins only.</p>
      </fieldset>
      <FormMessage error={state.error} success={event && state.ok ? "Saved." : undefined} />
      <span>
        <SubmitButton pending={pending} pendingText="Saving…">
          {event ? "Save event" : "Create event"}
        </SubmitButton>
      </span>
    </form>
  );
}
