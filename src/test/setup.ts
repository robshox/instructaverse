import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Each test file gets its own empty data directory (and so its own SQLite database).
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "instructaverse-test-"));
// Vite/Vitest pre-sets BASE_URL to "/" (its asset base), so assign rather than default.
process.env.BASE_URL = "http://localhost:3000";
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123";
