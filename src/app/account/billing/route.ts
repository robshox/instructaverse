import { billingPortalUrl } from "@/lib/billing/portal";
import { getViewer } from "@/lib/session";

/** "Manage billing": send the member to the Stripe Customer Portal for their own customer (AC-14). */
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return Response.redirect(new URL("/login", process.env.BASE_URL), 303);
  let url: string | null;
  try {
    url = await billingPortalUrl(viewer.id);
  } catch (e) {
    console.error("[stripe] couldn't open the billing portal", e);
    return Response.redirect(new URL("/account?billing=unavailable", process.env.BASE_URL), 303);
  }
  return Response.redirect(url ?? new URL("/pricing", process.env.BASE_URL), 303);
}
