import { handleMuxEvent } from "@/lib/courses/admin";
import { mux } from "@/lib/mux";

/** Mux webhook endpoint: verifies the signature, then updates the lesson's video state. */
export async function POST(request: Request) {
  const body = await request.text();
  try {
    await mux.webhooks.verifySignature(body, request.headers, process.env.MUX_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  try {
    await handleMuxEvent(event);
  } catch (e) {
    console.error(`[mux] failed to process ${event.type}`, e);
    return new Response("Processing failed", { status: 500 }); // Mux retries
  }
  return Response.json({ received: true });
}
