import { listGroups } from "@/lib/access";
import { listPlans } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { DeletePlanForm, PlanForm } from "./plan-form";

export const metadata = { title: "Plans · Admin" };

export default async function PlansPage() {
  await requireAdmin();
  const [plans, groups] = await Promise.all([listPlans(), listGroups()]);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <main className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Each plan matches one or more Stripe prices and puts buyers into groups.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {plans.length === 0 ? <p className="text-sm text-zinc-500">No plans yet.</p> : null}
        {plans.map((plan) => (
          <details key={plan.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <summary className="cursor-pointer">
              <span className="font-medium">{plan.name}</span>{" "}
              <span className="text-sm text-zinc-500">
                · {plan.type === "recurring" ? "Recurring" : "One-off"} · {plan.listed ? "Listed" : "Unlisted"} ·{" "}
                {plan.groupIds.map((id) => groupName.get(id)).join(", ")}
              </span>
            </summary>
            <div className="mt-4 flex flex-col gap-6">
              <PlanForm plan={plan} groups={groups} />
              <DeletePlanForm plan={plan} />
            </div>
          </details>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">New plan</h2>
        <PlanForm groups={groups} />
      </section>
    </main>
  );
}
