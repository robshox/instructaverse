"use client";

import { useActionState } from "react";
import { FormMessage, inputClass } from "@/components/form";
import { createGroupAction, deleteGroupAction, renameGroupAction, type GroupFormState } from "./actions";

const button = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-60 dark:border-zinc-700";

export function CreateGroupForm() {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(createGroupAction, {});
  return (
    <form action={action} key={state.ok} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="new-group">
          New group name
        </label>
        <input id="new-group" name="name" placeholder="New group name" required className={inputClass} />
        <button disabled={pending} className={button}>
          Add group
        </button>
      </div>
      <FormMessage error={state.error} />
    </form>
  );
}

export function GroupRow({ id, name, memberCount }: { id: string; name: string; memberCount: number }) {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(renameGroupAction, {});
  return (
    <li className="flex flex-col gap-2 py-3">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <label className="sr-only" htmlFor={`group-${id}`}>
          Group name
        </label>
        <input id={`group-${id}`} name="name" defaultValue={name} required className={inputClass} />
        <span className="w-28 shrink-0 text-sm text-zinc-500">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
        <button disabled={pending} className={button}>
          Rename
        </button>
      </form>
      {state.error ? <FormMessage error={state.error} /> : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-red-700 dark:text-red-400">Delete…</summary>
        <form action={deleteGroupAction} className="mt-2 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="confirm" value="yes" required />
            Remove &ldquo;{name}&rdquo; from {memberCount} {memberCount === 1 ? "member" : "members"} and from every
            course, board and event that uses it
          </label>
          <button className="rounded-md bg-red-700 px-3 py-1.5 font-medium text-white">Delete group</button>
        </form>
      </details>
    </li>
  );
}
