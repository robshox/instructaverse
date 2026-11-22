"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { Board } from "@/lib/community/boards";
import { saveBoardAction, type BoardFormState } from "./actions";

export function BoardForm({ board, groups }: { board?: Board; groups: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<BoardFormState, FormData>(saveBoardAction, {});
  return (
    <form action={action} key={board ? board.id : state.ok} className="flex flex-col gap-3">
      {board ? <input type="hidden" name="id" value={board.id} /> : null}
      <Field label="Name" name="name" defaultValue={board?.name} required />
      <fieldset className="text-sm">
        <legend className="mb-1 font-medium">Who can see it</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2">
              <input type="checkbox" name="groupIds" value={g.id} defaultChecked={board?.groupIds.includes(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
        <p className="mt-1 text-zinc-500">No groups ticked means only admins can see it.</p>
      </fieldset>
      <FormMessage error={state.error} success={board && state.ok ? "Saved." : undefined} />
      <SubmitButton pending={pending} pendingText="Saving…">
        {board ? "Save board" : "Create board"}
      </SubmitButton>
    </form>
  );
}
