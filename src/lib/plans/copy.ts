/** Plan card copy (FR-8.2, AC-23): the first description line is the summary; later lines become bullets. */
export function planCopy(description: string): { summary: string | null; bullets: string[] } {
  const [summary, ...bullets] = description
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
  return { summary: summary ?? null, bullets };
}

/** Split a Stripe price label into the amount and its cadence: "€49 / month" → ["€49", "/ month"]. */
export function splitPriceLabel(label: string): { amount: string; cadence: string } {
  const [amount = "", ...rest] = label.split(" ");
  return { amount, cadence: rest.join(" ") };
}

/**
 * The Stripe price a member of this plan pays, when that's certain: plans keep
 * older prices so legacy subscribers map to them, and a purchase doesn't record
 * which one it used, so with more than one price we can't say.
 */
export function memberPriceId(plan: { stripePriceIds: string[] }): string | null {
  return plan.stripePriceIds.length === 1 ? plan.stripePriceIds[0]! : null;
}
