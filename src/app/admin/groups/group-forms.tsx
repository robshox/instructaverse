"use client";

import { useActionState, useState } from "react";
import { FormMessage, inputClass, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { pillClass } from "@/components/ui";
import type { GroupUsage } from "@/lib/access/usage";
import { createGroupAction, deleteGroupAction, renameGroupAction, type GroupFormState } from "./actions";

export function CreateGroupForm() {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(createGroupAction, {});
  return (
    <form action={action} key={state.ok} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="new-group">
          New group name
        </label>
        <input id="new-group" name="name" placeholder="New group name" required className={`${inputClass} w-[220px] py-2`} />
        <SubmitButton pending={pending} pendingText="Adding…">
          Add group
        </SubmitButton>
      </div>
      {state.error ? <FormMessage error={state.error} /> : null}
    </form>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function usedBy(u: GroupUsage) {
  const parts = [u.courses && plural(u.courses, "course"), u.boards && plural(u.boards, "board"), u.events && plural(u.events, "event")].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** One group row (FR-9.6, AC-32): inline rename and an inline delete confirmation. */
export function GroupRow({ id, name, memberCount, usage }: { id: string; name: string; memberCount: number; usage: GroupUsage }) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<GroupFormState, FormData>(async (prev: GroupFormState, f: FormData) => {
    const result = await renameGroupAction(prev, f);
    if (!result.error) setRenaming(false);
    return result;
  }, {});
  const used = usedBy(usage);
  const reach = [plural(memberCount, "member"), used].filter(Boolean).join(" and ");

  return (
    <>
      <tr className="border-b border-line last:border-0 hover:bg-raised">
        <td className="px-5 py-[15px] font-medium">
          {renaming ? (
            <form action={action} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input type="hidden" name="id" value={id} />
                <label className="sr-only" htmlFor={`group-${id}`}>
                  Group name
                </label>
                <input id={`group-${id}`} name="name" defaultValue={name} required autoFocus className={`${inputClass} py-1.5`} />
                <SubmitButton pending={pending} pendingText="Saving…" size="sm">
                  Save
                </SubmitButton>
                <button type="button" onClick={() => setRenaming(false)} className={pillClass("ghost", "sm")}>
                  Cancel
                </button>
              </div>
              {state.error ? <FormMessage error={state.error} /> : null}
            </form>
          ) : (
            name
          )}
        </td>
        <td className="px-5 py-[15px] font-mono">{memberCount}</td>
        <td className="px-5 py-[15px] font-mono text-xs text-muted">{used ?? <span className="text-dim">Not used yet</span>}</td>
        <td className="px-5 py-[15px] font-mono text-xs text-muted">
          {usage.plans.length ? usage.plans.join(", ") : <span className="text-dim">Added by hand</span>}
        </td>
        <td className="px-5 py-[15px] text-right whitespace-nowrap">
          <button
            type="button"
            onClick={() => setRenaming(true)}
            aria-label={`Rename ${name}`}
            className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-fg"
          >
            <Icon name="pencil" size={15} />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${name}`}
            aria-expanded={confirming}
            className="rounded-md p-1.5 text-danger hover:bg-raised"
          >
            <Icon name="trash-2" size={15} />
          </button>
        </td>
      </tr>
      {confirming ? (
        <tr className="border-b border-line bg-danger/[.06] last:border-0">
          <td colSpan={5} className="px-5 py-3.5">
            <form action={deleteGroupAction} className="flex flex-wrap items-center gap-3 text-sm">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="confirm" value="yes" />
              <span className="text-danger">
                <Icon name="triangle-alert" size={16} />
              </span>
              <span>
                Delete <b className="font-medium">{name}</b>? It&rsquo;s removed from {reach}.
              </span>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className={pillClass("secondary", "sm")}>
                  Cancel
                </button>
                <button className={pillClass("danger", "sm", "bg-danger text-fg")}>Delete group</button>
              </span>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
