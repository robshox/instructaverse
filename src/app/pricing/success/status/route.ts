import { checkoutReady } from "@/lib/billing/checkout";

/** Polled by the success page until the checkout webhook has granted access. */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_\w+$/.test(sessionId)) return Response.json({ ready: false }, { status: 400 });
  return Response.json({ ready: await checkoutReady(sessionId) });
}
