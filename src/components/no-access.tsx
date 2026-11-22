import Link from "next/link";
import { Icon } from "@/components/icon";
import { Eyebrow, PillLink } from "@/components/ui";
import { getPriceLabel } from "@/lib/billing/prices";
import type { Plan } from "@/lib/plans";
import { planCopy } from "@/lib/plans/copy";

/**
 * Shown in place of gated content (FR-8.5, AC-26): the listed plans that would
 * grant access, with prices when Stripe returns them, or a note that it's private.
 */
export async function NoAccess({ title, plans, signedIn, kind = "Course" }: { title: string; plans: Plan[]; signedIn: boolean; kind?: "Course" | "Board" }) {
  const prices = await Promise.all(plans.map((p) => getPriceLabel(p.checkoutPriceId)));
  return (
    <main className="pt-7">
      <section className="mx-auto flex max-w-[720px] flex-col gap-[18px] rounded-md border border-line bg-surface p-10">
        <span className="flex size-12 items-center justify-center rounded-full border border-accent/50 text-accent">
          <Icon name="lock" size={20} />
        </span>
        <Eyebrow accent="Members only">{kind}</Eyebrow>
        <h1 className="text-4xl leading-[1.08] font-medium tracking-[-.035em]">{title} is for members.</h1>
        {plans.length ? (
          <>
            <p className="text-muted">Join with one of these plans to get access:</p>
            <ul className="mt-1 flex flex-col gap-2.5">
              {plans.map((p, i) => (
                <li key={p.id}>
                  <Link href="/pricing" className="flex items-center gap-4 rounded-md border border-line bg-raised px-[18px] py-4 hover:border-line-strong">
                    <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1">
                      <span className="font-medium">{p.name}</span>
                      {planCopy(p.description).summary ? <span className="block text-[13px] text-muted">{planCopy(p.description).summary}</span> : null}
                    </span>
                    {prices[i] ? <span className="font-mono text-sm">{prices[i]}</span> : null}
                    <span className="text-muted">
                      <Icon name="arrow-right" size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted">This isn&rsquo;t open to members yet.</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-2.5">
          {plans.length ? <PillLink href="/pricing">See all plans</PillLink> : null}
          {signedIn ? (
            <PillLink href="/courses" variant="secondary">
              Back to your courses
            </PillLink>
          ) : (
            <PillLink href="/login" variant="secondary">
              Already a member? Sign in
            </PillLink>
          )}
        </div>
      </section>
    </main>
  );
}
