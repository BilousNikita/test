import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Badge, PageHeader, td, th } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getMoney } from "@/lib/format";
import { marginPercent } from "@/lib/pricing";
import { PRODUCT_STATUSES } from "@/lib/validation";

export const metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const money = await getMoney();
  const where: Prisma.ProductWhereInput = {};
  if (sp.q)
    where.OR = [
      { searchText: { contains: sp.q.toLowerCase().slice(0, 80) } },
      { supplierSku: { contains: sp.q.slice(0, 80) } },
    ];
  if (sp.status && (PRODUCT_STATUSES as readonly string[]).includes(sp.status)) where.status = sp.status;
  if (sp.category) where.categoryId = sp.category;

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        category: true,
        images: { take: 1, orderBy: { position: "asc" } },
        variants: { select: { stock: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Products">
        <Link href="/admin/import-export" className="btn-outline h-10">
          Import / Export
        </Link>
        <Link href="/admin/products/new" className="btn-primary h-10">
          New product
        </Link>
      </PageHeader>
      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Search name or supplier SKU"
          className="input h-10 max-w-xs"
        />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-10 w-40">
          <option value="">All statuses</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select name="category" defaultValue={sp.category ?? ""} className="input h-10 w-44">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn-outline h-10">Filter</button>
      </form>
      <div className="border-line bg-surface overflow-x-auto border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-line border-b">
            <tr>
              <th className={th}></th>
              <th className={th}>Product</th>
              <th className={th}>Status</th>
              <th className={th}>Category</th>
              <th className={th}>Supplier</th>
              <th className={th}>Cost</th>
              <th className={th}>Price</th>
              <th className={th}>Margin</th>
              <th className={th}>Stock</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {products.map((p) => {
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={p.id} className="hover:bg-bg">
                  <td className={td}>
                    <div className="bg-subtle relative h-12 w-10">
                      {p.images[0] && (
                        <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                  </td>
                  <td className={td}>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.isPlaceholder && (
                      <span className="text-muted ms-2 text-[10px] uppercase">placeholder</span>
                    )}
                    <div className="text-muted text-xs">{p.variants.length} variants</div>
                  </td>
                  <td className={td}>
                    <Badge status={p.status} />
                  </td>
                  <td className={td}>{p.category?.name ?? "—"}</td>
                  <td className={td}>
                    {p.supplierName || "—"}
                    <div className="text-muted text-xs">{p.supplierSku}</div>
                  </td>
                  <td className={td}>{money(p.supplierCost)}</td>
                  <td className={td}>
                    {money(p.retailPrice)}
                    {p.priceOverride && <div className="text-muted text-[10px] uppercase">manual</div>}
                  </td>
                  <td className={td}>
                    {money(p.margin)}
                    <div className="text-muted text-xs">{marginPercent(p.retailPrice, p.supplierCost)}%</div>
                  </td>
                  <td className={`${td} ${stock === 0 ? "text-danger" : ""}`}>{stock}</td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="text-muted p-8 text-center">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
