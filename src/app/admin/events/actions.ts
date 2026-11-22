"use server";

import { refresh } from "next/cache";
import { createEvent, deleteEvent, EventInputError, updateEvent, type EventInput } from "@/lib/events";
import { requireAdmin } from "@/lib/session";

export type EventFormState = { error?: string; ok?: number };

function fromForm(f: FormData): EventInput {
  const s = (k: string) => String(f.get(k) ?? "");
  return {
    title: s("title"),
    description: s("description"),
    startsLocal: s("startsLocal"),
    endsLocal: s("endsLocal"),
    timezone: s("timezone"),
    zoomUrl: s("zoomUrl"),
    groupIds: f.getAll("groupIds").map(String),
  };
}

export async function saveEventAction(_p: EventFormState, f: FormData): Promise<EventFormState> {
  await requireAdmin();
  const id = f.get("id");
  try {
    if (typeof id === "string" && id) await updateEvent(id, fromForm(f));
    else await createEvent(fromForm(f));
  } catch (e) {
    if (e instanceof EventInputError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: Date.now() };
}

export async function deleteEventAction(f: FormData) {
  await requireAdmin();
  if (f.get("confirm") !== "yes") return;
  await deleteEvent(String(f.get("id")));
  refresh();
}
