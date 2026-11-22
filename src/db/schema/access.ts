import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * One row per (member, group, source). A member keeps a group while any
 * unexpired row for it exists (FR-2.5, FR-2.6). `sourceRef` identifies what
 * granted it: a Stripe subscription or payment ID for plans, the admin's ID
 * for manual grants.
 */
export const groupMembership = sqliteTable(
  "group_membership",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["plan", "manual"] }).notNull(),
    sourceRef: text("source_ref").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("group_membership_unique").on(t.userId, t.groupId, t.source, t.sourceRef),
    index("group_membership_user_idx").on(t.userId),
    index("group_membership_source_idx").on(t.source, t.sourceRef),
  ],
);
