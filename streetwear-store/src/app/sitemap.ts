import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, collections] = await Promise.all([
    db.product.findMany({ where: { status: "active" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true, updatedAt: true } }),
    db.collection.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  const staticPages = ["/", "/shop", "/about", "/contact", "/shipping", "/returns", "/privacy", "/terms"];
  return [
    ...staticPages.map((p) => ({
      url: absoluteUrl(p),
      changeFrequency: "weekly" as const,
      priority: p === "/" ? 1 : 0.5,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      lastModified: c.updatedAt,
      priority: 0.7,
    })),
    ...collections.map((c) => ({
      url: absoluteUrl(`/collections/${c.slug}`),
      lastModified: c.updatedAt,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/product/${p.slug}`),
      lastModified: p.updatedAt,
      priority: 0.8,
    })),
  ];
}
