import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
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
  if (plans.length === 0) return <p className="text-zinc-600 dark:text-zinc-400">Membership isn&rsquo;t open right now.</p>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => (
        <li key={plan.id} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">{plan.name}</h2>
          <p className="text-sm text-zinc-500">{plan.type === "recurring" ? "Subscription" : "One-off payment"}</p>
          {plan.description ? <p className="text-zinc-700 dark:text-zinc-300">{plan.description}</p> : null}
          <Link
            href={`/pricing/checkout?plan=${plan.id}`}
            className="mt-auto rounded-md bg-zinc-900 px-4 py-2 text-center font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Join
          </Link>
        </li>
      ))}
    </ul>
  );
}
