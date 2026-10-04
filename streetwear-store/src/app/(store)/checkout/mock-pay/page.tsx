import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getMoney } from "@/lib/format";
import { mockPaymentsAllowed } from "@/lib/payments";
import { safeEqual } from "@/lib/tokens";

export const metadata: Metadata = { title: "Test payment", robots: { index: false } };

/** Local stand-in for a payment page (PAYMENT_PROVIDER=mock). Disabled in production. */
export default async function MockPayPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  if (!mockPaymentsAllowed()) notFound();
  const { order: id, token } = await searchParams;
  const order = id ? await db.order.findUnique({ where: { id } }) : null;
  if (!order || !token || !safeEqual(order.accessToken, token)) notFound();
  const money = await getMoney();
  return (
    <div className="container-x flex min-h-[60vh] items-center justify-center py-16">
      <div className="border-line bg-surface w-full max-w-md border p-8 text-center">
        <p className="eyebrow text-accent">Test mode — no real payment</p>
        <h1 className="display mt-3 text-4xl">Pay {money(order.total)}</h1>
        <p className="text-muted mt-2 text-sm">Order {order.orderNumber}</p>
        {order.status === "pending" ? (
          <form action="/api/payments/mock" method="post" className="mt-8 space-y-3">
            <input type="hidden" name="order" value={order.id} />
            <input type="hidden" name="token" value={token} />
            <button className="btn-primary w-full" name="action" value="pay">
              Simulate successful payment
            </button>
            <button className="btn-outline w-full" name="action" value="cancel">
              Cancel
            </button>
          </form>
        ) : (
          <p className="mt-8 text-sm">This order is already {order.status}.</p>
        )}
      </div>
    </div>
  );
}
