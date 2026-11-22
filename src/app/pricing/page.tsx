import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { PublicHeader } from "@/components/public-header";
import { Card, Eyebrow, pillClass } from "@/components/ui";
import { getBrand } from "@/lib/brand";
import { getPriceLabel } from "@/lib/billing/prices";
import { listPlans } from "@/lib/plans";
import { planCopy, splitPriceLabel } from "@/lib/plans/copy";
import { getViewer } from "@/lib/session";

export const metadata = { title: "Join" };

/** Pricing (FR-8.2, AC-23). Copy comes from the brand and the plans (auto.md decision 12). */
export default function PricingPage() {
  return (
    <>
      <PublicHeader>
        <Suspense fallback={null}>
          <HeaderLink />
        </Suspense>
      </PublicHeader>
      <main className="mx-auto w-full max-w-[1120px] px-7 pt-18 pb-20">
        <Suspense fallback={<p className="text-sm text-muted">Loading plans…</p>}>
          <Hero />
          <PlanList />
        </Suspense>
      </main>
    </>
  );
}

async function HeaderLink() {
  const viewer = await getViewer();
  return (
    <Link
      href={viewer ? "/courses" : "/login"}
      className="rounded-full border border-accent px-3.5 py-[7px] font-mono text-xs uppercase tracking-[.04em] hover:bg-accent hover:text-on-accent"
    >
      {viewer ? "Your courses" : "Member login"}
    </Link>
  );
}

async function Hero() {
  await connection();
  const brand = getBrand();
  return (
    <section className="grid items-end gap-12 lg:grid-cols-[1fr_420px]">
      <div>
        <Eyebrow>
          {brand.name} <b className="font-normal text-accent">·</b> Join
        </Eyebrow>
        <h1 className="mt-[18px] max-w-[640px] text-[64px] leading-[.98] font-medium tracking-[-.045em]">{brand.tagline}</h1>
      </div>
      <Card className="px-[18px] py-4 font-mono text-[13px] leading-[1.9] text-muted">
        <div>
          <span className="text-accent">&gt;</span> <span className="text-fg">/join</span>
        </div>
        <div>
          <span className="text-ok">✓</span> secure checkout with Stripe
        </div>
        <div>
          <span className="text-ok">✓</span> access as soon as payment clears
        </div>
        <div>
          <span className="text-ok">✓</span> sign in with an email link, no password needed
        </div>
      </Card>
    </section>
  );
}

const letter = (i: number) => String.fromCharCode(65 + (i % 26));

async function PlanList() {
  await connection();
  const plans = await listPlans({ listedOnly: true });
  const prices = await Promise.all(plans.map((p) => getPriceLabel(p.checkoutPriceId)));
  if (plans.length === 0) return <Card className="mt-14 p-6 text-muted">Membership isn&rsquo;t open right now.</Card>;

  return (
    <ul className="mt-14 grid gap-5 md:grid-cols-2">
      {plans.map((plan, i) => {
        const { summary, bullets: rest } = planCopy(plan.description);
        const { amount, cadence } = splitPriceLabel(prices[i] ?? "");
        return (
          <li key={plan.id} className="flex flex-col rounded-md border border-line bg-surface p-8">
            <Eyebrow accent={`Path ${letter(i)}`}>{plan.type === "recurring" ? "Subscription" : "One-off payment"}</Eyebrow>
            <h2 className="mt-3 text-[32px] font-medium tracking-[-.035em]">{plan.name}</h2>
            {summary ? <p className="mt-2 text-muted">{summary}</p> : null}
            {prices[i] ? (
              <p className="mt-[22px] flex items-baseline gap-2.5">
                <span className="text-5xl font-medium tracking-[-.04em]">{amount}</span>
                <span className="font-mono text-xs uppercase tracking-[.04em] text-muted">{cadence || (plan.type === "recurring" ? "" : "one-off")}</span>
              </p>
            ) : null}
            {rest.length ? (
              <ul className="mt-4 border-t border-line pt-3.5">
                {rest.map((line) => (
                  <li key={line} className="flex gap-2.5 py-1.5 text-sm text-[#d6d6d6]">
                    <span aria-hidden className="font-mono text-ok">
                      ✓
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            {/* A POST form, not a link: links get prefetched, and this creates a Stripe session. */}
            <form method="post" action="/pricing/checkout" className="mt-auto pt-7">
              <input type="hidden" name="plan" value={plan.id} />
              <button className={pillClass(i === 0 ? "primary" : "outline", "md", "w-full py-[11px] text-[15px]")}>
                Join {plan.name} <Icon name="arrow-right" size={16} />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
