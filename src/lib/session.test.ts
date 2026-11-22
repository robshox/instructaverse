import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Each test sets the incoming request's cookie header.
let cookieHeader = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieHeader ? { cookie: cookieHeader } : {}),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { migrateDb } = await import("@/db");
const { auth } = await import("@/lib/auth");
const { createFirstAdmin } = await import("@/lib/setup");
const { getViewer, requireAdmin } = await import("@/lib/session");

async function cookieFor(email: string, password: string) {
  const res = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password }),
    }),
  );
  return res.headers.get("set-cookie")!.split(";")[0]!;
}

let adminCookie: string;
let memberCookie: string;

beforeAll(async () => {
  migrateDb();
  await createFirstAdmin({ name: "Admin", email: "admin@example.com", password: "admin-password-1" });
  await auth.api.signUpEmail({ body: { name: "Mem", email: "mem@example.com", password: "member-password-1" } });
  adminCookie = await cookieFor("admin@example.com", "admin-password-1");
  memberCookie = await cookieFor("mem@example.com", "member-password-1");
});

beforeEach(() => {
  cookieHeader = "";
});

describe("session helpers", () => {
  it("getViewer returns the signed-in user with their role", async () => {
    cookieHeader = memberCookie;
    expect(await getViewer()).toMatchObject({ email: "mem@example.com", role: "member" });
    cookieHeader = "";
    expect(await getViewer()).toBeNull();
  });

  it("requireAdmin sends signed-out visitors to login", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT /login");
  });

  it("requireAdmin hides admin pages from members (404)", async () => {
    cookieHeader = memberCookie;
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });

  it("requireAdmin returns the admin", async () => {
    cookieHeader = adminCookie;
    expect(await requireAdmin()).toMatchObject({ email: "admin@example.com", role: "admin" });
  });
});
