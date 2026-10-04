import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/store/ClearCart";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { safeEqual } from "@/lib/tokens";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const STATUS_TEXT: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Confirmed — we're preparing your order",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || !token || !safeEqual(order.accessToken, token)) notFound();
  const settings = await getSettings();
  const m = (v: number) => formatMoney(v, order.currency, settings.locale);
  const confirmed = order.status !== "pending" && order.status !== "cancelled";

  return (
    <div className="container-x max-w-4xl py-12 sm:py-20">
      {confirmed && <ClearCart />}
      <p className="eyebrow">Order {order.orderNumber}</p>
      <h1 className="display mt-3 text-5xl sm:text-7xl">
        {confirmed ? "Thank you." : STATUS_TEXT[order.status]}
      </h1>
      <p className="text-muted mt-4 text-[15px]">
        {confirmed
          ? `A confirmation has been sent to ${order.email}. We'll email you tracking details as soon as your order ships.`
          : order.status === "pending"
            ? "We haven't received the payment confirmation yet. If you completed the payment, refresh this page in a moment."
            : "This order was cancelled."}
      </p>

      <div className="border-line mt-10 grid gap-10 border-t pt-10 md:grid-cols-[1fr_280px]">
        <div>
          <ul className="divide-line divide-y">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <div className="bg-subtle relative aspect-[4/5] w-16 shrink-0">
                  {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">{i.productName}</p>
                  <p className="text-muted text-xs">
                    {i.variantLabel} · Qty {i.quantity}
                  </p>
                </div>
                <p className="text-sm">{m(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="border-line mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{m(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping ({order.shippingMethodName})</dt>
              <dd>{order.shippingCost ? m(order.shippingCost) : "Free"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{order.pricesIncludeTax ? "Incl. tax" : "Tax"}</dt>
              <dd>{m(order.taxAmount)}</dd>
            </div>
            <div className="border-line flex justify-between border-t pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>{m(order.total)}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-6 text-sm">
          <div>
            <p className="eyebrow mb-2">Status</p>
            <p>{STATUS_TEXT[order.status] ?? order.status}</p>
            {order.trackingNumber && (
              <p className="mt-2">
                Tracking:{" "}
                {order.trackingUrl ? (
                  <a href={order.trackingUrl} className="underline" rel="noopener noreferrer" target="_blank">
                    {order.trackingNumber}
                  </a>
                ) : (
                  order.trackingNumber
                )}
                {order.trackingCarrier && ` (${order.trackingCarrier})`}
              </p>
            )}
          </div>
          <div>
            <p className="eyebrow mb-2">Shipping to</p>
            <p>
              {order.shipName}
              <br />
              {order.shipLine1}
              {order.shipLine2 && (
                <>
                  <br />
                  {order.shipLine2}
                </>
              )}
              <br />
              {order.shipPostalCode} {order.shipCity}
              {order.shipRegion && `, ${order.shipRegion}`}
              <br />
              {order.shipCountry}
            </p>
          </div>
          <Link href="/shop" className="btn-outline w-full">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
