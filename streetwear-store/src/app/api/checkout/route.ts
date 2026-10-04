import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CheckoutError, createPendingOrder } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema, fieldErrors } from "@/lib/validation";

export async function POST(req: Request) {
  const rl = rateLimit(`checkout:${clientIp(req.headers)}`, 10, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Too many attempts – please wait a minute." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  let provider;
  try {
    provider = getPaymentProvider();
  } catch (err) {
    console.error("[checkout]", (err as Error).message);
    return NextResponse.json({ error: "Payments are temporarily unavailable." }, { status: 503 });
  }

  try {
    const order = await createPendingOrder(parsed.data, provider.id);
    const session = await provider.createCheckout(order);
    await db.order.update({ where: { id: order.id }, data: { paymentRef: session.paymentRef } });

    if (parsed.data.newsletter) {
      await db.newsletterSubscriber
        .upsert({ where: { email: parsed.data.email }, update: {}, create: { email: parsed.data.email } })
        .catch(() => undefined);
    }
    return NextResponse.json({ redirectUrl: session.redirectUrl, orderId: order.id });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[checkout] failed", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
