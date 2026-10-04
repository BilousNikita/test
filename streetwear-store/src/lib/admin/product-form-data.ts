import { db } from "@/lib/db";
import { toMajor } from "@/lib/money";
import type { ProductFormData } from "@/components/admin/ProductForm";

export async function getProductFormOptions() {
  const [categories, collections] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, collections };
}

export async function getProductFormData(id: string, currency: string): Promise<ProductFormData | null> {
  const p = await db.product.findUnique({
    where: { id },
    include: {
      collections: { select: { id: true } },
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    details: p.details,
    status: p.status,
    featured: p.featured,
    tags: p.tags,
    categoryId: p.categoryId ?? "",
    collectionIds: p.collections.map((c) => c.id),
    supplierName: p.supplierName,
    supplierSku: p.supplierSku,
    supplierUrl: p.supplierUrl,
    supplierCost: toMajor(p.supplierCost, currency),
    retailPrice: toMajor(p.retailPrice, currency),
    compareAtPrice: p.compareAtPrice != null ? toMajor(p.compareAtPrice, currency) : "",
    priceOverride: p.priceOverride,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      stock: v.stock,
      supplierSku: v.supplierSku,
    })),
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, color: i.color })),
  };
}

export const emptyProduct: ProductFormData = {
  name: "",
  slug: "",
  description: "",
  details: "",
  status: "draft",
  featured: false,
  tags: "",
  categoryId: "",
  collectionIds: [],
  supplierName: "",
  supplierSku: "",
  supplierUrl: "",
  supplierCost: "",
  retailPrice: "",
  compareAtPrice: "",
  priceOverride: false,
  variants: [],
  images: [],
};
