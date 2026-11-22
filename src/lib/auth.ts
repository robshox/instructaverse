import { AsyncLocalStorage } from "node:async_hooks";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { lazy } from "@/lib/lazy";
import * as schema from "@/db/schema";

/**
 * Set while the first-admin setup flow is creating its account. Before any user
 * exists, sign-up is only allowed inside this context, so the first admin can't
 * be claimed through the public sign-up endpoint.
 */
export const setupContext = new AsyncLocalStorage<true>();

function createAuth() {
  return betterAuth({
  baseURL: process.env.BASE_URL,
  secret: process.env.AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "member", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const isFirstUser = (await db.$count(schema.user)) === 0;
          if (isFirstUser && !setupContext.getStore()) return false;
          return { data: { ...newUser, role: isFirstUser ? "admin" : "member" } };
        },
      },
    },
  },
  // Must stay last so it sees cookies set by other plugins.
  plugins: [nextCookies()],
  });
}

/** Better Auth instance, created on first use (secrets aren't available at build time). */
export const auth: ReturnType<typeof createAuth> = lazy(createAuth);

export type Session = typeof auth.$Infer.Session;
