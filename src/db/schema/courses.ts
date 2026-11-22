import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { groups } from "./access";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

// `externalId` lets API bulk imports (e.g. from Circle) be re-run without duplicates (FR-8.5).

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  coverImage: text("cover_image"),
  position: integer("position").notNull().default(0),
  externalId: text("external_id").unique(),
  createdAt: createdAt(),
});

/** Groups that can see a course. None = admins only (AC-17). */
export const courseGroups = sqliteTable(
  "course_groups",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.groupId] })],
);

export const modules = sqliteTable(
  "modules",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    externalId: text("external_id").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("modules_course_idx").on(t.courseId)],
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    bodyMd: text("body_md").notNull().default(""),
    /** Plain text or WebVTT. WebVTT is also used as the video's captions. */
    transcript: text("transcript"),
    muxAssetId: text("mux_asset_id"),
    muxPlaybackId: text("mux_playback_id"),
    /** Mux asset state: preparing | ready | errored. Null when there's no video. */
    muxStatus: text("mux_status"),
    externalId: text("external_id").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId)],
);
