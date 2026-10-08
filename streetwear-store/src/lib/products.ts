import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { applyPricing } from "./pricing";
import { getSettings } from "./settings";
import { importRemoteImage } from "./storage";
import { slugify } from "./validation";
import type { ImportedProduct } from "./suppliers/types";

export function buildSearchText(p: {
  name: string;
  description?: string;
  tags?: string;
  categoryName?: string;
}) {
  return [p.name, p.tags, p.categoryName, p.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 2000);
}

/** Recomputes retail price + margin for every product that does not have a manual price override. */
export async function recalculateAllPrices() {
  const { markup, currency } = await getSettings();
  const products = await db.product.findMany({
    select: { id: true, supplierCost: true, retailPrice: true, priceOverride: true },
  });
  let changed = 0;
  for (const p of products) {
    const next = applyPricing(p, markup, currency);
    await db.product.update({ where: { id: p.id }, data: next });
    if (next.retailPrice !== p.retailPrice) changed++;
  }
  return changed;
}

async function resolveCategoryId(ref?: string): Promise<string | null> {
  if (!ref) return null;
  const slug = slugify(ref);
  const existing = await db.category.findFirst({ where: { OR: [{ slug }, { name: ref }] } });
  if (existing) return existing.id;
  const created = await db.category.create({ data: { name: ref, slug } });
  return created.id;
}

export interface ImportReport {
  created: number;
  updated: number;
  variants: number;
  errors: string[];
}

/** Upserts normalized products (from CSV or a supplier API) by slug; variants by SKU. */
export async function importProducts(list: ImportedProduct[]): Promise<ImportReport> {
  const { markup, currency } = await getSettings();
  const report: ImportReport = { created: 0, updated: 0, variants: 0, errors: [] };

  for (const p of list) {
    try {
      const categoryId = await resolveCategoryId(p.category);
      const category = categoryId ? await db.category.findUnique({ where: { id: categoryId } }) : null;
      const collections = p.collections?.length
        ? await db.collection.findMany({ where: { slug: { in: p.collections } }, select: { id: true } })
        : [];

      const images: string[] = [];
      for (const src of p.images) {
        if (src.startsWith("/uploads/")) images.push(src);
        else if (/^https?:\/\//i.test(src)) {
          try {
            images.push(await importRemoteImage(src, "products"));
          } catch (err) {
            report.errors.push(`${p.slug}: image ${src} skipped (${(err as Error).message})`);
          }
        }
      }

      const pricing = applyPricing(
        { supplierCost: p.supplierCost, retailPrice: p.retailPrice ?? 0, priceOverride: p.priceOverride },
        markup,
        currency,
      );
      const data = {
        name: p.name,
        description: p.description,
        details: p.details,
        status: p.status,
        featured: p.featured,
        tags: p.tags,
        searchText: buildSearchText({ ...p, categoryName: category?.name }),
        supplierName: p.supplierName,
        supplierSku: p.supplierSku,
        supplierUrl: p.supplierUrl,
        supplierCost: p.supplierCost,
        compareAtPrice: p.compareAtPrice ?? null,
        priceOverride: p.priceOverride,
        ...pricing,
        category: categoryId ? { connect: { id: categoryId } } : { disconnect: true },
      } satisfies Prisma.ProductUpdateInput;

      const existing = await db.product.findUnique({ where: { slug: p.slug } });
      const product = existing
        ? await db.product.update({
            where: { id: existing.id },
            data: { ...data, collections: { set: collections } },
          })
        : await db.product.create({
            data: {
              ...data,
              slug: p.slug,
              category: categoryId ? { connect: { id: categoryId } } : undefined,
              collections: { connect: collections },
            },
          });
      if (existing) report.updated++;
      else report.created++;

      if (images.length) {
        await db.productImage.deleteMany({ where: { productId: product.id } });
        await db.productImage.createMany({
          data: images.map((url, position) => ({ productId: product.id, url, position, alt: p.name })),
        });
      }

      for (const [position, v] of p.variants.entries()) {
        const vData = {
          productId: product.id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex ?? "#111111",
          stock: v.stock,
          supplierSku: v.supplierSku ?? "",
          position,
        };
        const clash = await db.variant.findFirst({
          where: { productId: product.id, size: v.size, color: v.color, NOT: { sku: v.sku } },
        });
        if (clash) await db.variant.delete({ where: { id: clash.id } }).catch(() => undefined);
        await db.variant.upsert({ where: { sku: v.sku }, update: vData, create: { ...vData, sku: v.sku } });
        report.variants++;
      }
    } catch (err) {
      report.errors.push(`${p.slug}: ${(err as Error).message}`);
    }
  }
  return report;
}
