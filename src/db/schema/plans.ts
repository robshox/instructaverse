import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { groups } from "./access";

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  type: text("type", { enum: ["one_off", "recurring"] }).notNull(),
  /** Shown on the public pricing page. Unlisted plans still work for existing members. */
  listed: integer("listed", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * Stripe prices that belong to a plan. `position` 0 is the price new checkouts
 * use; the rest map existing subscribers (e.g. prices created by Circle) to the
 * plan during migration (FR-9.1).
 */
export const planPrices = sqliteTable(
  "plan_prices",
  {
    stripePriceId: text("stripe_price_id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [index("plan_prices_plan_idx").on(t.planId)],
);

/** Groups a plan grants. */
export const planGroups = sqliteTable(
  "plan_groups",
  {
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.planId, t.groupId] })],
);
