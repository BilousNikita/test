import Stripe from "stripe";
import { absoluteUrl, env } from "../env";
import type { PaymentProvider } from "./types";

let client: Stripe | null = null;
export function stripeClient(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!client) client = new Stripe(key, { appInfo: { name: "streetwear-store" } });
  return client;
}

export const isStripeTestMode = () => (env().STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");

/**
 * Stripe Checkout (hosted page). All amounts come from the order we already priced on the server.
 * The sum of the line items + shipping (+ tax when prices exclude tax) equals order.total exactly.
 */
export const stripeProvider: PaymentProvider = {
  id: "stripe",

  async createCheckout(order) {
    const currency = order.currency.toLowerCase();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency,
        unit_amount: i.unitPrice,
        product_data: { name: i.productName, description: i.variantLabel },
      },
    }));
    if (!order.pricesIncludeTax && order.taxAmount > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: order.taxAmount,
          product_data: { name: `Tax (${(order.taxRateBps / 100).toFixed(2).replace(/\.?0+$/, "")}%)` },
        },
      });
    }

    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      payment_intent_data: { metadata: { orderId: order.id, orderNumber: order.orderNumber } },
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: order.shippingMethodName,
            fixed_amount: { amount: order.shippingCost, currency },
          },
        },
      ],
      success_url: absoluteUrl(
        `/checkout/success?order=${order.id}&token=${order.accessToken}&session_id={CHECKOUT_SESSION_ID}`,
      ),
      cancel_url: absoluteUrl(`/checkout?canceled=1`),
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { redirectUrl: session.url, paymentRef: session.id };
  },

  async verifyPayment(paymentRef) {
    const session = await stripeClient().checkout.sessions.retrieve(paymentRef);
    const pi =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    return { paid: session.payment_status === "paid", paymentIntentRef: pi ?? null };
  },
};
