"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputClass, labelClass, SubmitButton } from "@/components/form";
import { ChipCheckbox, pillClass } from "@/components/ui";
import type { Plan } from "@/lib/plans";
import { deletePlanAction, savePlanAction, type PlanFormState } from "./actions";

type Group = { id: string; name: string };

export function PlanForm({ plan, groups }: { plan?: Plan; groups: Group[] }) {
  const [state, action, pending] = useActionState<PlanFormState, FormData>(savePlanAction, {});
  const prefix = plan?.id ?? "new";

  return (
    // New-plan form remounts (clears) after each successful save.
    <form action={action} key={plan ? plan.id : state.ok} className="flex flex-col gap-4">
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      <Field label="Name" name="name" defaultValue={plan?.name} required />
      <label className={labelClass}>
        Description
        <textarea name="description" defaultValue={plan?.description} rows={3} className={`${inputClass} font-sans text-[15px] tracking-normal normal-case`} />
        <span className="font-sans text-xs tracking-normal text-dim normal-case">First line is the summary on /pricing; further lines become bullets.</span>
      </label>

      <fieldset className="flex gap-6 text-sm">
        <legend className={`${labelClass} mb-2`}>Billing</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="type" value="recurring" defaultChecked={plan ? plan.type === "recurring" : true} />
          Recurring
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="type" value="one_off" defaultChecked={plan?.type === "one_off"} />
          One-off
        </label>
      </fieldset>

      <label className={labelClass}>
        Stripe price IDs
        <textarea
          name="stripePriceIds"
          defaultValue={plan?.stripePriceIds.join("\n")}
          rows={2}
          required
          placeholder="price_…"
          className={`${inputClass} font-mono text-[13px] tracking-normal normal-case`}
          aria-describedby={`${prefix}-prices-help`}
        />
        <span id={`${prefix}-prices-help`} className="font-sans text-xs tracking-normal text-dim normal-case">
          One per line. The first is used for new sign-ups; add older prices so existing subscribers map to this plan.
        </span>
      </label>

      <fieldset className="text-sm">
        <legend className={`${labelClass} mb-2`}>Grants access to</legend>
        {groups.length === 0 ? (
          <p className="text-muted">Create a group first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <ChipCheckbox key={g.id} name="groupIds" value={g.id} defaultChecked={plan?.groupIds.includes(g.id)}>
                {g.name}
              </ChipCheckbox>
            ))}
          </div>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="listed" defaultChecked={plan ? plan.listed : true} />
        Show on the public pricing page
      </label>

      <FormMessage error={state.error} success={plan && state.ok ? "Saved." : undefined} />
      <span>
        <SubmitButton pending={pending} pendingText="Saving…">
          {plan ? "Save plan" : "Create plan"}
        </SubmitButton>
      </span>
    </form>
  );
}

export function DeletePlanForm({ plan }: { plan: Pick<Plan, "id" | "name"> }) {
  const [state, action, pending] = useActionState<PlanFormState, FormData>(deletePlanAction, {});
  return (
    <form action={action} className="flex flex-col gap-2 text-sm">
      <input type="hidden" name="id" value={plan.id} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="confirm" value="yes" required />
          Delete &ldquo;{plan.name}&rdquo;
        </label>
        <button disabled={pending} className={pillClass("danger", "sm")}>
          Delete plan
        </button>
      </div>
      {state.error ? <FormMessage error={state.error} /> : null}
    </form>
  );
}
