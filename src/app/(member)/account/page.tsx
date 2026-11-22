import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { account, groups, planGroups, plans, purchases, user } from "@/db/schema";
import { Icon } from "@/components/icon";
import { Avatar, Card, Eyebrow, PillLink, pillClass, Tag } from "@/components/ui";
import { getPriceLabel } from "@/lib/billing/prices";
import { getPlan } from "@/lib/plans";
import { memberPriceId } from "@/lib/plans/copy";
import { getViewer } from "@/lib/session";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Your account" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <main className="flex flex-col gap-8">
      <Suspense>
        <BillingNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function BillingNotice({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const { billing } = await searchParams;
  if (billing !== "unavailable") return null;
  return (
    <p role="alert" className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
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
const statusTone: Record<string, "ok" | "warn" | "dim" | "danger"> = {
  active: "ok",
  trialing: "ok",
  paid: "ok",
  past_due: "warn",
  canceled: "dim",
  unpaid: "danger",
  refunded: "dim",
};

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function AccountDetails() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const [[member], rows, [credential]] = await Promise.all([
    db.select({ stripeCustomerId: user.stripeCustomerId, createdAt: user.createdAt }).from(user).where(eq(user.id, viewer.id)),
    db
      .select({ purchase: purchases, planName: plans.name, planDescription: plans.description, planType: plans.type })
      .from(purchases)
      .innerJoin(plans, eq(plans.id, purchases.planId))
      .where(eq(purchases.userId, viewer.id))
      .orderBy(desc(purchases.createdAt)),
    db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, viewer.id), eq(account.providerId, "credential"), isNotNull(account.password))),
  ]);

  const planIds = [...new Set(rows.map((r) => r.purchase.planId))];
  const [grants, prices] = await Promise.all([
    planIds.length
      ? db
          .select({ planId: planGroups.planId, name: groups.name })
          .from(planGroups)
          .innerJoin(groups, eq(groups.id, planGroups.groupId))
          .where(inArray(planGroups.planId, planIds))
      : Promise.resolve([]),
    Promise.all(
      planIds.map(async (id) => {
        const plan = await getPlan(id);
        const priceId = plan ? memberPriceId(plan) : null;
        return [id, priceId ? await getPriceLabel(priceId) : null] as const;
      }),
    ).then((entries) => new Map(entries)),
  ]);

  return (
    <>
      <div>
        <Eyebrow>
          Settings <b className="font-normal text-accent">·</b> Account
        </Eyebrow>
        <div className="mt-3.5 flex items-center gap-[18px]">
          <Avatar name={viewer.name} size={56} />
          <div>
            <h1 className="text-[40px] leading-[1.05] font-medium tracking-[-.04em]">{viewer.name}</h1>
            <p className="mt-1 font-mono text-[13px] text-muted">
              {viewer.email}
              {member?.createdAt ? ` · member since ${member.createdAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          {rows.length === 0 ? (
            <Card className="p-6">
              <Eyebrow accent="Membership" />
              <p className="mt-3.5 text-muted">No membership yet.</p>
              <PillLink href="/pricing" className="mt-5">
                See plans <Icon name="arrow-right" size={16} />
              </PillLink>
            </Card>
          ) : (
            rows.map(({ purchase, planName, planDescription, planType }) => {
              const ended = ["canceled", "unpaid", "refunded"].includes(purchase.status);
              const price = prices.get(purchase.planId);
              const groupNames = grants.filter((g) => g.planId === purchase.planId).map((g) => g.name);
              return (
                <Card key={purchase.id} className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Eyebrow accent="Membership" />
                    <Tag tone={statusTone[purchase.status] ?? "default"}>
                      <span aria-hidden>●</span> {statusText[purchase.status] ?? purchase.status}
                    </Tag>
                  </div>
                  <h2 className="mt-3.5 text-[26px] font-medium tracking-[-.03em]">{planName}</h2>
                  {planDescription ? <p className="text-sm text-muted">{planDescription}</p> : null}
                  <dl className="mt-[18px] text-sm">
                    <Row label="Plan">
                      {planType === "recurring" ? "Subscription" : "One-off"}
                      {price ? ` · ${price}` : ""}
                    </Row>
                    {purchase.currentPeriodEnd && !ended ? (
                      <Row label={planType === "recurring" ? (purchase.cancelAtPeriodEnd ? "Ends" : "Renews") : "Access"}>
                        <span className="font-mono text-[13px]">
                          {planType === "recurring" ? "" : "until "}
                          {date(purchase.currentPeriodEnd)}
                        </span>
                      </Row>
                    ) : null}
                    <Row label="Since">
                      <span className="font-mono text-[13px]">{date(purchase.createdAt)}</span>
                    </Row>
                    {groupNames.length ? <Row label="Groups">{groupNames.join(", ")}</Row> : null}
                  </dl>
                </Card>
              );
            })
          )}
          {member?.stripeCustomerId || rows.length ? (
            <div className="flex flex-wrap gap-2.5">
              {member?.stripeCustomerId ? (
                <form method="post" action="/account/billing">
                  <button className={pillClass("secondary")}>
                    <Icon name="credit-card" size={16} /> Manage billing
                  </button>
                </form>
              ) : null}
              {rows.length ? (
                <PillLink href="/pricing" variant="ghost">
                  See other plans →
                </PillLink>
              ) : null}
            </div>
          ) : null}
        </div>

        <Card className="p-6">
          <Eyebrow accent="Password" />
          <div className="mt-3">
            <PasswordForm hasPassword={Boolean(credential)} />
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-3.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
