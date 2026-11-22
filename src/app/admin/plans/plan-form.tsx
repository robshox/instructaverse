"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form";
import type { Plan } from "@/lib/plans";
import { savePlanAction, type PlanFormState } from "./actions";

type Group = { id: string; name: string };

export function PlanForm({ plan, groups }: { plan?: Plan; groups: Group[] }) {
  const [state, action, pending] = useActionState<PlanFormState, FormData>(savePlanAction, {});
  const prefix = plan?.id ?? "new";

  return (
    // New-plan form remounts (clears) after each successful save.
    <form action={action} key={plan ? plan.id : state.ok} className="flex flex-col gap-4">
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      <Field label="Name" name="name" defaultValue={plan?.name} required />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea name="description" defaultValue={plan?.description} rows={2} className={inputClass} />
      </label>

      <fieldset className="flex gap-6 text-sm">
        <legend className="mb-1 font-medium">Billing</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="type" value="recurring" defaultChecked={plan ? plan.type === "recurring" : true} />
          Recurring
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="type" value="one_off" defaultChecked={plan?.type === "one_off"} />
          One-off
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Stripe price IDs
        <textarea
          name="stripePriceIds"
          defaultValue={plan?.stripePriceIds.join("\n")}
          rows={2}
          required
          placeholder="price_…"
          className={`${inputClass} font-mono`}
          aria-describedby={`${prefix}-prices-help`}
        />
        <span id={`${prefix}-prices-help`} className="font-normal text-zinc-500">
          One per line. The first is used for new sign-ups; add older prices so existing subscribers map to this plan.
        </span>
      </label>

      <fieldset className="text-sm">
        <legend className="mb-1 font-medium">Grants access to</legend>
        {groups.length === 0 ? (
          <p className="text-zinc-500">Create a group first.</p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2">
                <input type="checkbox" name="groupIds" value={g.id} defaultChecked={plan?.groupIds.includes(g.id)} />
                {g.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="listed" defaultChecked={plan ? plan.listed : true} />
        Show on the public pricing page
      </label>

      <FormMessage error={state.error} success={plan && state.ok ? "Saved." : undefined} />
      <SubmitButton pending={pending} pendingText="Saving…">
        {plan ? "Save plan" : "Create plan"}
      </SubmitButton>
    </form>
  );
}
