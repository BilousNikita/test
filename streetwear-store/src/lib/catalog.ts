import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const PER_PAGE = 12;

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "ONE SIZE"];
export function sortSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    const na = Number.parseFloat(a);
    const nb = Number.parseFloat(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

export const cardInclude = {
  images: { orderBy: { position: "asc" }, take: 2 },
  variants: { select: { color: true, colorHex: true, stock: true }, orderBy: { position: "asc" } },
} satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export const SORTS = {
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  "price-asc": { label: "Price: low to high", orderBy: [{ retailPrice: "asc" }] },
  "price-desc": { label: "Price: high to low", orderBy: [{ retailPrice: "desc" }] },
  name: { label: "Name A–Z", orderBy: [{ name: "asc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }>;
export type SortKey = keyof typeof SORTS;

export interface CatalogQuery {
  categorySlug?: string;
  collectionSlug?: string;
  q?: string;
  sizes?: string[];
  colors?: string[];
  minPrice?: number; // minor units
  maxPrice?: number;
  sort?: SortKey;
  page?: number;
}

export async function getNavCategories() {
  return db.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { name: true, slug: true },
  });
}

export async function searchProducts(query: CatalogQuery) {
  const scope: Prisma.ProductWhereInput = { status: "active" };
  if (query.categorySlug) scope.category = { slug: query.categorySlug };
  if (query.collectionSlug) scope.collections = { some: { slug: query.collectionSlug } };
  if (query.q) {
    const terms = query.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    scope.AND = terms.map((t) => ({ searchText: { contains: t } }));
  }

  const where: Prisma.ProductWhereInput = { ...scope };
  const variantFilter: Prisma.VariantWhereInput = {};
  if (query.sizes?.length) variantFilter.size = { in: query.sizes };
  if (query.colors?.length) variantFilter.color = { in: query.colors };
  if (Object.keys(variantFilter).length) where.variants = { some: variantFilter };
  if (query.minPrice != null || query.maxPrice != null) {
    where.retailPrice = {
      ...(query.minPrice != null ? { gte: query.minPrice } : {}),
      ...(query.maxPrice != null ? { lte: query.maxPrice } : {}),
    };
  }

  const page = Math.max(1, query.page ?? 1);
  const sort = SORTS[query.sort ?? "newest"] ?? SORTS.newest;

  const [products, total, facetVariants, priceAgg] = await Promise.all([
    db.product.findMany({
      where,
      include: cardInclude,
      orderBy: sort.orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.product.count({ where }),
    db.variant.findMany({
      where: { product: scope },
      select: { size: true, color: true, colorHex: true },
      distinct: ["size", "color"],
    }),
    db.product.aggregate({ where: scope, _min: { retailPrice: true }, _max: { retailPrice: true } }),
  ]);

  const colorMap = new Map<string, string>();
  for (const v of facetVariants) if (!colorMap.has(v.color)) colorMap.set(v.color, v.colorHex);

  return {
    products,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PER_PAGE)),
    facets: {
      sizes: sortSizes([...new Set(facetVariants.map((v) => v.size))]),
      colors: [...colorMap.entries()].map(([name, hex]) => ({ name, hex })),
      minPrice: priceAgg._min.retailPrice ?? 0,
      maxPrice: priceAgg._max.retailPrice ?? 0,
    },
  };
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "active" },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
  });
}

export async function getRelatedProducts(productId: string, categoryId: string | null, take = 4) {
  const related = await db.product.findMany({
    where: { status: "active", id: { not: productId }, ...(categoryId ? { categoryId } : {}) },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
  if (related.length >= take) return related;
  const more = await db.product.findMany({
    where: { status: "active", id: { notIn: [productId, ...related.map((r) => r.id)] } },
    include: cardInclude,
    take: take - related.length,
  });
  return [...related, ...more];
}

export async function getNewArrivals(take = 8) {
  return db.product.findMany({
    where: { status: "active" },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getFeaturedCollections() {
  return db.collection.findMany({
    where: { featured: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    take: 3,
    include: { _count: { select: { products: { where: { status: "active" } } } } },
  });
}

/** Parses Next.js searchParams into a CatalogQuery (all values validated/sanitized). */
export function parseCatalogParams(
  sp: Record<string, string | string[] | undefined>,
  toMinorUnits: (major: string) => number,
): CatalogQuery & { category?: string } {
  const list = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v : v ? v.split(",") : [])
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 20);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim();
  const num = (v?: string) => {
    if (!v) return undefined;
    const n = toMinorUnits(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const sort = one(sp.sort);
  return {
    q: one(sp.q)?.slice(0, 80) || undefined,
    category: one(sp.category)?.slice(0, 80) || undefined,
    sizes: list(sp.size),
    colors: list(sp.color),
    minPrice: num(one(sp.min)),
    maxPrice: num(one(sp.max)),
    sort: sort && sort in SORTS ? (sort as SortKey) : "newest",
    page: Math.min(500, Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1)),
  };
}
