import { connection } from "next/server";
import { Suspense } from "react";
import { getPriceLabel } from "@/lib/billing/prices";
import { listPlans } from "@/lib/plans";

export const metadata = { title: "Join" };

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">Join the community</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading plans…</p>}>
        <PlanList />
      </Suspense>
    </main>
  );
}

async function PlanList() {
  await connection();
  const plans = await listPlans({ listedOnly: true });
  const prices = await Promise.all(plans.map((p) => getPriceLabel(p.checkoutPriceId)));
  if (plans.length === 0) return <p className="text-zinc-600 dark:text-zinc-400">Membership isn&rsquo;t open right now.</p>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan, i) => (
        <li key={plan.id} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">{plan.name}</h2>
          {prices[i] ? <p className="text-2xl font-semibold">{prices[i]}</p> : null}
          <p className="text-sm text-zinc-500">{plan.type === "recurring" ? "Subscription" : "One-off payment"}</p>
          {plan.description ? <p className="text-zinc-700 dark:text-zinc-300">{plan.description}</p> : null}
          {/* A POST form, not a link: links get prefetched, and this creates a Stripe session. */}
          <form method="post" action="/pricing/checkout" className="mt-auto">
            <input type="hidden" name="plan" value={plan.id} />
            <button className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              Join
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
