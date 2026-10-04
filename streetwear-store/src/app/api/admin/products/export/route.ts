import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { productsToCsv } from "@/lib/suppliers/csv";

export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const { currency } = await getSettings();
  const template = new URL(req.url).searchParams.has("template");
  const products = template
    ? []
    : await db.product.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          category: true,
          collections: true,
          images: { orderBy: { position: "asc" } },
          variants: { orderBy: { position: "asc" } },
        },
      });
  const csv = productsToCsv(
    products.map((p) => ({
      ...p,
      categorySlug: p.category?.slug ?? null,
      collectionSlugs: p.collections.map((c) => c.slug),
      images: p.images.map((i) => i.url),
      variants: p.variants,
    })),
    currency,
  );
  const name = template ? "products-template.csv" : `products-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
