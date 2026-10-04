import Link from "next/link";
import { Badge, Card, PageHeader, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Dashboard" };

const PAID = ["paid", "processing", "shipped", "delivered"];

export default async function Dashboard() {
  const s = await getSettings();
  const m = (v: number) => formatMoney(v, s.currency, s.locale);
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [all, last30, pendingSupplier, top, lowStock, recent, subscribers] = await Promise.all([
    db.order.aggregate({
      where: { status: { in: PAID } },
      _sum: { total: true, taxAmount: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { status: { in: PAID }, paidAt: { gte: since30 } },
      _sum: { total: true },
      _count: true,
    }),
    db.supplierOrder.count({ where: { status: "pending" } }),
    db.orderItem.groupBy({
      by: ["productName"],
      where: { order: { status: { in: PAID } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    db.variant.findMany({
      where: { stock: { lte: s.lowStockThreshold }, product: { status: "active" } },
      orderBy: { stock: "asc" },
      take: 10,
      include: { product: { select: { id: true, name: true } } },
    }),
    db.order.findMany({ where: { status: { not: "pending" } }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.newsletterSubscriber.count(),
  ]);

  const revenue = all._sum.total ?? 0;
  const aov = all._count ? Math.round(revenue / all._count) : 0;

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Revenue (all time)" value={m(revenue)} />
        <Stat label="Revenue (30 days)" value={m(last30._sum.total ?? 0)} sub={`${last30._count} orders`} />
        <Stat label="Paid orders" value={String(all._count)} sub={`AOV ${m(aov)}`} />
        <Stat
          label="To forward to suppliers"
          value={String(pendingSupplier)}
          href="/admin/supplier-orders"
          highlight={pendingSupplier > 0}
        />
        <Stat label="Newsletter subscribers" value={String(subscribers)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Recent orders" className="xl:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Customer</th>
                <th className={th}>Status</th>
                <th className={th}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className={td}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className={td}>{o.shipName}</td>
                  <td className={td}>
                    <Badge status={o.status} />
                  </td>
                  <td className={td}>{formatMoney(o.total, o.currency, s.locale)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted p-6 text-center">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card title="Top products">
          <ol className="space-y-2 text-sm">
            {top.map((t, i) => (
              <li key={t.productName} className="flex justify-between gap-3">
                <span>
                  <span className="text-muted">{i + 1}.</span> {t.productName}
                </span>
                <span className="text-muted whitespace-nowrap">{t._sum.quantity} sold</span>
              </li>
            ))}
            {top.length === 0 && <li className="text-muted">No sales yet.</li>}
          </ol>
        </Card>
        <Card title={`Low stock (≤ ${s.lowStockThreshold})`} className="xl:col-span-3">
          <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {lowStock.map((v) => (
              <Link
                key={v.id}
                href={`/admin/products/${v.product.id}`}
                className="border-line hover:bg-bg flex justify-between border-b py-1.5"
              >
                <span>
                  {v.product.name}{" "}
                  <span className="text-muted">
                    · {v.color} / {v.size}
                  </span>
                </span>
                <span className={v.stock === 0 ? "text-danger font-semibold" : ""}>{v.stock}</span>
              </Link>
            ))}
            {lowStock.length === 0 && <p className="text-muted">All variants are well stocked.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <div
      className={`h-full border p-4 ${highlight ? "border-accent bg-accent/10" : "border-line bg-surface"}`}
    >
      <p className="text-muted text-[11px] font-semibold tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-muted text-xs">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
