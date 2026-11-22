import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { groups } from "./access";
import { user } from "./auth";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const boards = sqliteTable("boards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
});

/** Groups that can see a board. None = admins only. */
export const boardGroups = sqliteTable(
  "board_groups",
  {
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.boardId, t.groupId] })],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bodyMd: text("body_md").notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("posts_board_idx").on(t.boardId, t.pinned, t.createdAt)],
);

/** Images attached to a post. `path` is relative to DATA_DIR/uploads and only ever served via /media. */
export const postImages = sqliteTable(
  "post_images",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    path: text("path").notNull().unique(),
    contentType: text("content_type").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("post_images_post_idx").on(t.postId)],
);
