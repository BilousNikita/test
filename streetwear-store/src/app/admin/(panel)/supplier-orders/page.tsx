import Link from "next/link";
import { Badge, PageHeader, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SUPPLIER_ORDER_STATUSES } from "@/lib/validation";

export const metadata = { title: "Supplier orders" };

export default async function SupplierOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; supplier?: string }>;
}) {
  const sp = await searchParams;
  const s = await getSettings();
  const status =
    sp.status && (SUPPLIER_ORDER_STATUSES as readonly string[]).includes(sp.status)
      ? sp.status
      : sp.status === "all"
        ? undefined
        : "pending";
  const [rows, suppliers] = await Promise.all([
    db.supplierOrder.findMany({
      where: { ...(status ? { status } : {}), ...(sp.supplier ? { supplierName: sp.supplier } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { order: { select: { id: true, orderNumber: true, shipName: true, shipCountry: true } } },
    }),
    db.supplierOrder.findMany({ distinct: ["supplierName"], select: { supplierName: true } }),
  ]);
  return (
    <>
      <PageHeader title="Supplier orders" />
      <p className="text-muted mb-4 max-w-2xl text-sm">
        One supplier order is created per supplier when a customer order is paid. Forward it to the supplier
        (copy the text block on the order page), then mark it as placed and add the supplier&apos;s tracking
        number.
      </p>
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="status" defaultValue={sp.status ?? "pending"} className="input h-10 w-40">
          <option value="all">All</option>
          {SUPPLIER_ORDER_STATUSES.map((st) => (
            <option key={st}>{st}</option>
          ))}
        </select>
        <select name="supplier" defaultValue={sp.supplier ?? ""} className="input h-10 w-56">
          <option value="">All suppliers</option>
          {suppliers.map((x) => (
            <option key={x.supplierName}>{x.supplierName}</option>
          ))}
        </select>
        <button className="btn-outline h-10">Filter</button>
      </form>
      <div className="border-line bg-surface overflow-x-auto border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-line border-b">
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Supplier</th>
              <th className={th}>Status</th>
              <th className={th}>Items</th>
              <th className={th}>Ship to</th>
              <th className={th}>Supplier ref</th>
              <th className={th}>Created</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((r) => {
              const items = JSON.parse(r.itemsSnapshot) as { quantity: number }[];
              return (
                <tr key={r.id} className="hover:bg-bg">
                  <td className={td}>
                    <Link href={`/admin/orders/${r.order.id}`} className="font-medium hover:underline">
                      {r.order.orderNumber}
                    </Link>
                  </td>
                  <td className={td}>{r.supplierName}</td>
                  <td className={td}>
                    <Badge status={r.status} />
                  </td>
                  <td className={td}>{items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className={td}>
                    {r.order.shipName} ({r.order.shipCountry})
                  </td>
                  <td className={td}>
                    {r.supplierOrderRef ?? "—"}
                    {r.trackingNumber && <div className="text-muted text-xs">{r.trackingNumber}</div>}
                  </td>
                  <td className={td}>{r.createdAt.toLocaleDateString(s.locale)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted p-8 text-center">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
