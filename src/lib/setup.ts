import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth, setupContext } from "@/lib/auth";

export class SetupAlreadyCompleteError extends Error {
  constructor() {
    super("Setup has already been completed");
    this.name = "SetupAlreadyCompleteError";
  }
}

// Setup completes once and never reverts, so cache the positive answer.
let complete = false;

/** True once any account exists. Cheap enough to call on every request. */
export function isSetupComplete(): boolean {
  if (!complete) complete = (db.select({ n: count() }).from(user).get()?.n ?? 0) > 0;
  return complete;
}

let inFlight: Promise<unknown> | undefined;

/** Create the first account as an admin. Throws if any account already exists. */
export async function createFirstAdmin(input: { name: string; email: string; password: string }) {
  // Serialise concurrent submissions so two first-admins can't race in.
  while (inFlight) await inFlight.catch(() => {});
  if (isSetupComplete()) throw new SetupAlreadyCompleteError();

  const run = setupContext.run(true, () => auth.api.signUpEmail({ body: input }));
  inFlight = run;
  try {
    const { user: created } = await run;
    // The installer owns this address. Marking it verified also stops Better Auth
    // from wiping the admin's password the first time they use a magic link
    // (its protection against pre-registered, unverified accounts).
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, created.id));
    complete = true;
    return { ...created, emailVerified: true } as typeof created & { role: string };
  } finally {
    inFlight = undefined;
  }
}
