import { Icon } from "@/components/icon";
import { Eyebrow, Tag } from "@/components/ui";
import { listGroups } from "@/lib/access";
import { getPriceLabel } from "@/lib/billing/prices";
import { listPlans, planBuyerCounts } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { ListedToggle } from "./listed-toggle";
import { DeletePlanForm, PlanForm } from "./plan-form";

export const metadata = { title: "Plans · Admin" };

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-20 shrink-0 pt-0.5 font-mono text-[11px] tracking-[.04em] text-dim">{label}</span>
      <span className="flex min-w-0 flex-wrap gap-1.5">{children}</span>
    </div>
  );
}

/** Plans (FR-9.5, AC-31). */
export default async function PlansPage() {
  await requireAdmin();
  const [plans, groups, buyers] = await Promise.all([listPlans(), listGroups(), planBuyerCounts()]);
  const prices = await Promise.all(plans.map((p) => getPriceLabel(p.checkoutPriceId)));
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <main className="flex flex-col gap-7">
      <div>
        <Eyebrow>
          Admin <b className="font-normal text-accent">·</b> Billing
        </Eyebrow>
        <h1 className="mt-2 text-[34px] leading-[1.1] font-medium tracking-[-.035em]">Plans</h1>
        <p className="mt-1.5 text-sm text-muted">Each plan matches Stripe prices and puts buyers into groups.</p>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        {plans.map((plan, i) => (
          <article key={plan.id} className={`flex flex-col gap-3.5 rounded-md border border-line bg-surface p-[22px] ${plan.listed ? "" : "opacity-80"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow>{plan.type === "recurring" ? "Recurring" : "One-off"}</Eyebrow>
                <h2 className="mt-1.5 text-[22px] font-medium tracking-[-.025em]">{plan.name}</h2>
              </div>
              {prices[i] ? <span className="text-right text-[22px] font-medium tracking-[-.03em]">{prices[i]}</span> : null}
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              <MetaRow label="PRICES">
                {plan.stripePriceIds.map((id, n) => (
                  <code key={id} className={`rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-xs text-muted ${n ? "opacity-70" : ""}`}>
                    {id}
                  </code>
                ))}
              </MetaRow>
              <MetaRow label="GRANTS">
                {plan.groupIds.map((id) => (
                  <Tag key={id}>{groupName.get(id) ?? "Unknown group"}</Tag>
                ))}
              </MetaRow>
              <MetaRow label="BUYERS">
                <span className="font-mono">{buyers.get(plan.id) ?? 0}</span>
              </MetaRow>
            </div>
            <div className="flex items-center gap-2.5 border-t border-line pt-3.5">
              <ListedToggle planId={plan.id} planName={plan.name} listed={plan.listed} />
            </div>
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-medium hover:border-muted [&::-webkit-details-marker]:hidden">
                <Icon name="pencil" size={14} /> Edit
              </summary>
              <div className="mt-4 flex flex-col gap-6 border-t border-line pt-4">
                <PlanForm plan={plan} groups={groups} />
                <DeletePlanForm plan={plan} />
              </div>
            </details>
          </article>
        ))}

        <details className="group rounded-md border border-dashed border-line-strong open:border-solid open:border-line open:bg-surface">
          <summary className="flex min-h-40 cursor-pointer list-none flex-col items-center justify-center gap-2 text-muted group-open:min-h-0 group-open:items-start group-open:px-[22px] group-open:pt-[22px] hover:text-fg [&::-webkit-details-marker]:hidden">
            <span className="text-accent">
              <Icon name="plus" size={20} />
            </span>
            <span>New plan</span>
            <span className="font-mono text-[11px] text-dim group-open:hidden">Link a Stripe price, choose groups</span>
          </summary>
          <div className="p-[22px]">
            <PlanForm groups={groups} />
          </div>
        </details>
      </div>
      <p className="font-mono text-xs text-dim">Plans with buyers can&rsquo;t be deleted. Unlist them to hide them from the pricing page.</p>
    </main>
  );
}
