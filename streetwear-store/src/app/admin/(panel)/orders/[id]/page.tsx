import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { SupplierOrderCard } from "@/components/admin/SupplierOrderCard";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { refundNoteAction, updateOrderStatusAction, updateTrackingAction } from "@/lib/admin/order-actions";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { ORDER_STATUSES } from "@/lib/validation";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, supplierOrders: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();
  const s = await getSettings();
  const m = (v: number) => formatMoney(v, order.currency, s.locale);
  const cost = order.items.reduce((sum, i) => sum + i.supplierCost * i.quantity, 0);
  const net = order.total - order.taxAmount; // revenue excluding tax
  const date = (d: Date | null) =>
    d ? d.toLocaleString(s.locale, { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <>
      <PageHeader title={order.orderNumber}>
        <Badge status={order.status} />
        <Link href="/admin/orders" className="btn-outline h-10">
          All orders
        </Link>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Items">
            <ul className="divide-line divide-y">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-3 text-sm">
                  <div className="bg-subtle relative h-16 w-12 shrink-0">
                    {i.imageUrl && (
                      <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{i.productName}</p>
                    <p className="text-muted text-xs">
                      {i.variantLabel} · SKU {i.sku} · Supplier: {i.supplierName || "—"}{" "}
                      {i.supplierSku && `(${i.supplierSku})`}
                    </p>
                  </div>
                  <div className="text-end">
                    <p>
                      {i.quantity} × {m(i.unitPrice)}
                    </p>
                    <p className="text-muted text-xs">cost {m(i.supplierCost * i.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="border-line mt-4 grid grid-cols-2 gap-y-1 border-t pt-4 text-sm">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-end">{m(order.subtotal)}</dd>
              <dt className="text-muted">Shipping ({order.shippingMethodName})</dt>
              <dd className="text-end">{m(order.shippingCost)}</dd>
              <dt className="text-muted">
                {order.pricesIncludeTax ? "Incl. tax" : "Tax"} ({order.taxRateBps / 100}%)
              </dt>
              <dd className="text-end">{m(order.taxAmount)}</dd>
              <dt className="font-semibold">Total paid</dt>
              <dd className="text-end font-semibold">{m(order.total)}</dd>
              <dt className="text-muted">Supplier cost</dt>
              <dd className="text-end">{m(cost)}</dd>
              <dt className="text-muted">Gross profit (excl. tax, before fees & shipping cost)</dt>
              <dd className="text-end">{m(net - cost)}</dd>
            </dl>
          </Card>

          <div>
            <h2 className="mb-3 text-xs font-semibold tracking-[0.16em] uppercase">Supplier orders</h2>
            {order.supplierOrders.length === 0 ? (
              <p className="text-muted text-sm">
                Supplier orders are created automatically when the order is paid.
              </p>
            ) : (
              <div className="space-y-4">
                {order.supplierOrders.map((so) => (
                  <SupplierOrderCard key={so.id} so={so} orderNumber={order.orderNumber} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="text-sm">{order.email}</p>
            <p className="mt-3 text-sm">
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
              {order.shipPhone && (
                <>
                  <br />
                  {order.shipPhone}
                </>
              )}
            </p>
            <dl className="text-muted mt-4 space-y-1 text-xs">
              <div>Created: {date(order.createdAt)}</div>
              <div>Paid: {date(order.paidAt)}</div>
              <div>Shipped: {date(order.shippedAt)}</div>
              <div>
                Payment: {order.paymentProvider} {order.paymentIntentRef ?? order.paymentRef ?? ""}
              </div>
              <div>
                Confirmation email: {order.confirmationSentAt ? date(order.confirmationSentAt) : "not sent"}
              </div>
            </dl>
          </Card>

          <Card title="Status">
            <ActionForm action={updateOrderStatusAction} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <select name="status" defaultValue={order.status} className="input h-10">
                {ORDER_STATUSES.map((st) => (
                  <option key={st}>{st}</option>
                ))}
              </select>
              <textarea
                name="adminNotes"
                defaultValue={order.adminNotes ?? ""}
                rows={3}
                placeholder="Internal notes"
                className="input h-auto py-2 text-sm"
              />
              <SubmitButton className="btn-primary h-10 w-full">Update status</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Tracking">
            <ActionForm action={updateTrackingAction} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <input
                name="trackingNumber"
                defaultValue={order.trackingNumber ?? ""}
                placeholder="Tracking number"
                className="input h-10"
              />
              <input
                name="trackingCarrier"
                defaultValue={order.trackingCarrier ?? ""}
                placeholder="Carrier (e.g. DHL, YunExpress)"
                className="input h-10"
              />
              <input
                name="trackingUrl"
                type="url"
                defaultValue={order.trackingUrl ?? ""}
                placeholder="Tracking URL (optional)"
                className="input h-10"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notify" defaultChecked /> Email the customer when a new tracking
                number is added
              </label>
              <SubmitButton className="btn-primary h-10 w-full">Save tracking</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Refund note">
            <ActionForm action={refundNoteAction} className="space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <textarea
                name="refundNote"
                defaultValue={order.refundNote ?? ""}
                rows={3}
                placeholder="Reason, amount, date…"
                className="input h-auto py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="markRefunded" /> Mark order as refunded
              </label>
              <p className="text-muted text-xs">
                Refunds themselves are issued in the Stripe dashboard (Payments → refund).
              </p>
              <SubmitButton className="btn-outline h-10 w-full">Save refund note</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
