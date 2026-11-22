import { afterEach, describe, expect, it, vi } from "vitest";

const viewer = { id: "u1", name: "U", email: "u@example.com", role: "member" };
vi.mock("@/lib/session", () => ({ getViewer: vi.fn(async () => viewer) }));
vi.mock("@/lib/billing/portal", () => ({ billingPortalUrl: vi.fn() }));

const { POST } = await import("./route");
const { getViewer } = await import("@/lib/session");
const { billingPortalUrl } = await import("@/lib/billing/portal");

afterEach(() => vi.clearAllMocks());

describe("POST /account/billing", () => {
  it("redirects to the member's Stripe portal session", async () => {
    vi.mocked(billingPortalUrl).mockResolvedValue("https://billing.stripe.com/p/s_1");
    const res = await POST();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://billing.stripe.com/p/s_1");
    expect(billingPortalUrl).toHaveBeenCalledWith("u1");
  });

  it("sends members without a Stripe customer to the plans", async () => {
    vi.mocked(billingPortalUrl).mockResolvedValue(null);
    expect((await POST()).headers.get("location")).toBe("http://localhost:3000/pricing");
  });

  it("returns to the account page with a message if Stripe is unavailable", async () => {
    vi.mocked(billingPortalUrl).mockRejectedValue(new Error("Stripe down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST()).headers.get("location")).toBe("http://localhost:3000/account?billing=unavailable");
  });

  it("sends signed-out visitors to login", async () => {
    vi.mocked(getViewer).mockResolvedValueOnce(null);
    expect((await POST()).headers.get("location")).toBe("http://localhost:3000/login");
  });
});
