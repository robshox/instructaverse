import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { lazy } from "@/lib/lazy";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

/** Directory holding the SQLite database and uploads. `/data` in the Docker image. */
export function dataDir(): string {
  return process.env.DATA_DIR || "/data";
}

function open(): Db {
  const dir = dataDir();
  mkdirSync(dir, { recursive: true });
  const sqlite = new Database(join(dir, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

// One connection per process (survives dev hot reloads), opened on first use so
// that importing this module (e.g. during `next build`) never touches the disk.
const globalForDb = globalThis as unknown as { __instructaverseDb?: Db };

export function getDb(): Db {
  return (globalForDb.__instructaverseDb ??= open());
}

/** Lazy handle to the database; behaves exactly like the Drizzle instance. */
export const db: Db = lazy(getDb);

/** Apply pending migrations from ./drizzle. Safe to run on every start. */
export function migrateDb(migrationsFolder = join(process.cwd(), "drizzle")): void {
  migrate(getDb(), { migrationsFolder });
}
