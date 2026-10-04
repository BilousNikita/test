import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { finalizePaidOrder } from "@/lib/orders";
import { stripeClient } from "@/lib/payments/stripe";

/**
 * Stripe webhook – configure in the Stripe dashboard (Developers → Webhooks) with URL
 *   {SITE_URL}/api/webhooks/stripe
 * and events: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.expired. Put the signing secret in STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (err) {
    console.error("[stripe] invalid webhook signature", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId ?? session.client_reference_id;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      if (orderId && session.payment_status === "paid") {
        const pi =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        await finalizePaidOrder(orderId, { paymentIntentRef: pi });
      }
      break;
    case "checkout.session.expired":
      if (orderId)
        await db.order.updateMany({
          where: { id: orderId, status: "pending" },
          data: { status: "cancelled" },
        });
      break;
  }
  return NextResponse.json({ received: true });
}
