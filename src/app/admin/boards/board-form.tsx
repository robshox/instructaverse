"use client";

import { useActionState } from "react";
import { Field, FormMessage, labelClass, SubmitButton } from "@/components/form";
import { ChipCheckbox } from "@/components/ui";
import type { Board } from "@/lib/community/boards";
import { saveBoardAction, type BoardFormState } from "./actions";

export function BoardForm({ board, groups }: { board?: Board; groups: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<BoardFormState, FormData>(saveBoardAction, {});
  return (
    <form action={action} key={board ? board.id : state.ok} className="flex flex-col gap-3">
      {board ? <input type="hidden" name="id" value={board.id} /> : null}
      <Field label="Name" name="name" defaultValue={board?.name} required />
      <fieldset>
        <legend className={`${labelClass} mb-2`}>Who can see it</legend>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <ChipCheckbox key={g.id} name="groupIds" value={g.id} defaultChecked={board?.groupIds.includes(g.id)}>
              {g.name}
            </ChipCheckbox>
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-dim">None selected = admins only.</p>
      </fieldset>
      <FormMessage error={state.error} success={board && state.ok ? "Saved." : undefined} />
      <span>
        <SubmitButton pending={pending} pendingText="Saving…">
          {board ? "Save board" : "Create board"}
        </SubmitButton>
      </span>
    </form>
  );
}
