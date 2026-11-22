import { and, desc, eq, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { account, plans, purchases, user } from "@/db/schema";
import { getViewer } from "@/lib/session";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Your account" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-12">
      <h1 className="text-2xl font-semibold">Your account</h1>
      <Suspense>
        <BillingNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function BillingNotice({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const { billing } = await searchParams;
  if (billing !== "unavailable") return null;
  return (
    <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      Billing is temporarily unavailable. Please try again in a few minutes.
    </p>
  );
}

const statusText: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment overdue — update your card",
  canceled: "Ended",
  unpaid: "Ended (unpaid)",
  paid: "Paid",
  refunded: "Refunded",
};

const date = (d: Date) => d.toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" });

async function AccountDetails() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const [[member], rows, [credential]] = await Promise.all([
    db.select({ stripeCustomerId: user.stripeCustomerId }).from(user).where(eq(user.id, viewer.id)),
    db
      .select({ purchase: purchases, planName: plans.name })
      .from(purchases)
      .innerJoin(plans, eq(plans.id, purchases.planId))
      .where(eq(purchases.userId, viewer.id))
      .orderBy(desc(purchases.createdAt)),
    db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, viewer.id), eq(account.providerId, "credential"), isNotNull(account.password))),
  ]);

  return (
    <>
      <section className="flex flex-col gap-1">
        <p className="font-medium">{viewer.name}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{viewer.email}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Membership</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No membership yet. <a href="/pricing" className="underline">See plans</a>
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map(({ purchase, planName }) => (
              <li key={purchase.id} className="flex flex-wrap justify-between gap-2 py-3">
                <span className="font-medium">{planName}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {statusText[purchase.status] ?? purchase.status}
                  {purchase.currentPeriodEnd && !["canceled", "unpaid"].includes(purchase.status)
                    ? ` · ${purchase.cancelAtPeriodEnd ? "ends" : "renews"} ${date(purchase.currentPeriodEnd)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        {member?.stripeCustomerId ? (
          <form method="post" action="/account/billing">
            <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">
              Manage billing
            </button>
          </form>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Password</h2>
        <PasswordForm hasPassword={Boolean(credential)} />
      </section>
    </>
  );
}
