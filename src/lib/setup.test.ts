import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { db, migrateDb } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createFirstAdmin, isSetupComplete, SetupAlreadyCompleteError } from "@/lib/setup";
import { proxy } from "@/proxy";

const admin = { name: "Rob", email: "admin@example.com", password: "correct-horse-battery" };

beforeAll(() => {
  migrateDb();
});

describe("first-admin setup (AC-1)", () => {
  it("on a fresh install, sends visitors to /setup", async () => {
    expect(isSetupComplete()).toBe(false);
    const res = await proxy(new NextRequest("http://localhost:3000/courses"));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/setup");
  });

  it("does not redirect /setup itself, health checks or auth API calls", async () => {
    for (const path of ["/setup", "/healthz", "/api/auth/get-session"]) {
      const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
      expect(res?.headers.get("location") ?? null).toBeNull();
    }
  });

  it("rejects public sign-up before setup, so nobody can grab the first admin account", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "Mallory", email: "m@example.com", password: "password-123" } }),
    ).rejects.toThrow();
    expect(await db.$count(user)).toBe(0);
  });

  it("makes the first account an admin", async () => {
    const created = await createFirstAdmin(admin);
    expect(created.role).toBe("admin");
    const [row] = await db.select().from(user);
    expect(row).toMatchObject({ email: admin.email, role: "admin", emailVerified: true });
    expect(isSetupComplete()).toBe(true);
  });

  it("after setup, /setup is no longer available", async () => {
    await expect(createFirstAdmin({ ...admin, email: "second@example.com" })).rejects.toBeInstanceOf(
      SetupAlreadyCompleteError,
    );
    const res = await proxy(new NextRequest("http://localhost:3000/courses"));
    expect(res?.headers.get("location") ?? null).toBeNull();
    const setup = await proxy(new NextRequest("http://localhost:3000/setup"));
    expect(setup?.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/_setup-complete");
  });

  it("later sign-ups are members, never admins", async () => {
    const res = await auth.api.signUpEmail({
      body: { name: "Member", email: "member@example.com", password: "password-123" },
    });
    expect((res.user as { role?: string }).role).toBe("member");
  });
});
