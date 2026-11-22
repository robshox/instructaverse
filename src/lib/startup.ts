import { migrateDb } from "@/db";
import { EnvError, parseEnv } from "@/lib/env";

/**
 * Runs once when the server starts, before it accepts requests:
 * 1. In production, validate configuration and exit naming any bad variable (AC-44).
 * 2. Apply pending database migrations, so a fresh volume is ready (AC-43).
 */
export function runStartup(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.NODE_ENV === "production") {
    try {
      parseEnv(process.env);
    } catch (e) {
      if (!(e instanceof EnvError)) throw e;
      console.error(`${e.message}\nSet these environment variables and restart.`);
      process.exit(1);
    }
  }

  migrateDb();
}
