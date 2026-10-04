import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { finalizePaidOrder } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { safeEqual } from "@/lib/tokens";

/**
 * Return URL after payment. Verifies the payment with the provider directly (so orders are confirmed
 * even if the webhook is delayed or not configured yet), then shows the confirmation page.
 */
export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  const { order: id, token } = await searchParams;
  if (!id || !token) notFound();
  const order = await db.order.findUnique({ where: { id } });
  if (!order || !safeEqual(order.accessToken, token)) notFound();

  if (order.status === "pending" && order.paymentRef) {
    try {
      const result = await getPaymentProvider(order.paymentProvider).verifyPayment(order.paymentRef);
      if (result.paid) await finalizePaidOrder(order.id, { paymentIntentRef: result.paymentIntentRef });
    } catch (err) {
      console.error("[checkout/success] verification failed", err);
    }
  }
  redirect(`/order/${order.id}?token=${encodeURIComponent(token)}`);
}
