import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge, PageHeader, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { ORDER_STATUSES } from "@/lib/validation";

export const metadata = { title: "Orders" };
const PER = 30;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const s = await getSettings();
  const where: Prisma.OrderWhereInput = {};
  if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status;
  else if (!sp.status) where.status = { not: "pending" }; // hide abandoned checkouts by default
  if (sp.q) {
    const q = sp.q.trim().slice(0, 100);
    where.OR = [
      { orderNumber: { contains: q.toUpperCase() } },
      { email: { contains: q.toLowerCase() } },
      { shipName: { contains: q } },
    ];
  }
  const from = sp.from ? new Date(sp.from) : null;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : null;
  if ((from && !isNaN(+from)) || (to && !isNaN(+to))) {
    where.createdAt = {
      ...(from && !isNaN(+from) ? { gte: from } : {}),
      ...(to && !isNaN(+to) ? { lte: to } : {}),
    };
  }
  const page = Math.max(1, Number(sp.page) || 1);
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER,
      take: PER,
      include: { _count: { select: { items: true } }, supplierOrders: { select: { status: true } } },
    }),
    db.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) =>
    new URLSearchParams({
      ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>),
      page: String(p),
    }).toString();

  return (
    <>
      <PageHeader title="Orders" />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Order #, email or name"
          className="input h-10 max-w-xs"
        />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-10 w-44">
          <option value="">All except pending</option>
          {ORDER_STATUSES.map((st) => (
            <option key={st}>{st}</option>
          ))}
        </select>
        <label className="text-muted text-xs">
          From <input type="date" name="from" defaultValue={sp.from} className="input h-10 w-40" />
        </label>
        <label className="text-muted text-xs">
          To <input type="date" name="to" defaultValue={sp.to} className="input h-10 w-40" />
        </label>
        <button className="btn-outline h-10">Filter</button>
      </form>
      <div className="border-line bg-surface overflow-x-auto border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-line border-b">
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Date</th>
              <th className={th}>Customer</th>
              <th className={th}>Status</th>
              <th className={th}>Supplier</th>
              <th className={th}>Items</th>
              <th className={th}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-bg">
                <td className={td}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className={td}>
                  {o.createdAt.toLocaleString(s.locale, { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className={td}>
                  {o.shipName}
                  <div className="text-muted text-xs">{o.email}</div>
                </td>
                <td className={td}>
                  <Badge status={o.status} />
                </td>
                <td className={td}>
                  {o.supplierOrders.length
                    ? o.supplierOrders.map((so, i) => <Badge key={i} status={so.status} />)
                    : "—"}
                </td>
                <td className={td}>{o._count.items}</td>
                <td className={td}>{formatMoney(o.total, o.currency, s.locale)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted p-8 text-center">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`?${qs(page - 1)}`} className="underline">
              ← Prev
            </Link>
          )}
          <span className="text-muted">
            Page {page} / {pages} · {total} orders
          </span>
          {page < pages && (
            <Link href={`?${qs(page + 1)}`} className="underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
