import Papa from "papaparse";
import { toMajor, toMinor } from "../money";
import { slugify } from "../validation";
import type { ImportedProduct, SupplierAdapter } from "./types";

/**
 * CSV adapter – works out of the box. One row per VARIANT; rows sharing the same `handle`
 * form one product (product-level columns are read from the first row of the handle).
 * Prices are in MAJOR units (e.g. 12.50). `images` is a "|" separated list of URLs or /uploads paths.
 * Leave `retail_price` empty to use the automatic markup rule.
 */
export const CSV_COLUMNS = [
  "handle",
  "name",
  "category",
  "collections",
  "description",
  "details",
  "status",
  "featured",
  "tags",
  "supplier_name",
  "supplier_sku",
  "supplier_url",
  "supplier_cost",
  "retail_price",
  "compare_at_price",
  "price_override",
  "images",
  "variant_sku",
  "size",
  "color",
  "color_hex",
  "stock",
  "variant_supplier_sku",
] as const;

type Row = Partial<Record<(typeof CSV_COLUMNS)[number], string>>;

const truthy = (v?: string) => ["1", "true", "yes", "y"].includes((v ?? "").trim().toLowerCase());

export interface CsvParseResult {
  products: ImportedProduct[];
  errors: string[];
}

export function parseProductsCsv(text: string, currency: string): CsvParseResult {
  // Strip BOM and normalize mixed line endings (spreadsheet tools mix \r\n and \n).
  const parsed = Papa.parse<Row>(text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const errors: string[] = parsed.errors.slice(0, 20).map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  const map = new Map<string, ImportedProduct>();

  parsed.data.forEach((row, idx) => {
    const line = idx + 2;
    const handle = slugify(row.handle || row.name || "");
    if (!handle) {
      errors.push(`Row ${line}: missing handle/name`);
      return;
    }
    let p = map.get(handle);
    if (!p) {
      const cost = toMinor(row.supplier_cost || "0", currency);
      const retail = row.retail_price?.trim() ? toMinor(row.retail_price, currency) : undefined;
      const compare = row.compare_at_price?.trim() ? toMinor(row.compare_at_price, currency) : null;
      if (!row.name?.trim()) errors.push(`Row ${line}: missing name for "${handle}"`);
      if (Number.isNaN(cost) || (retail !== undefined && Number.isNaN(retail))) {
        errors.push(`Row ${line}: invalid price for "${handle}"`);
        return;
      }
      const status = (row.status || "active").trim().toLowerCase();
      p = {
        slug: handle,
        name: (row.name || handle).trim().slice(0, 200),
        category: row.category?.trim() || undefined,
        collections: (row.collections || "")
          .split("|")
          .map((c) => slugify(c))
          .filter(Boolean),
        description: (row.description || "").trim(),
        details: (row.details || "").replace(/\\n/g, "\n").trim(),
        status: (["active", "draft", "archived"].includes(status)
          ? status
          : "draft") as ImportedProduct["status"],
        featured: truthy(row.featured),
        tags: (row.tags || "").trim(),
        supplierName: (row.supplier_name || "").trim(),
        supplierSku: (row.supplier_sku || "").trim(),
        supplierUrl: (row.supplier_url || "").trim(),
        supplierCost: cost,
        retailPrice: retail,
        compareAtPrice: compare !== null && Number.isNaN(compare) ? null : compare,
        priceOverride: truthy(row.price_override) || (retail !== undefined && !row.supplier_cost?.trim()),
        images: (row.images || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean),
        variants: [],
      };
      map.set(handle, p);
    }
    if (row.variant_sku?.trim() || row.size?.trim() || row.color?.trim()) {
      const stock = Number.parseInt(row.stock || "0", 10);
      p.variants.push({
        sku: (row.variant_sku || `${handle}-${slugify(row.color || "x")}-${slugify(row.size || "os")}`)
          .trim()
          .toUpperCase(),
        size: (row.size || "One Size").trim(),
        color: (row.color || "Default").trim(),
        colorHex: /^#[0-9a-f]{3,8}$/i.test(row.color_hex?.trim() ?? "") ? row.color_hex!.trim() : undefined,
        stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
        supplierSku: (row.variant_supplier_sku || "").trim(),
      });
    }
  });

  return { products: [...map.values()], errors };
}

export interface ExportableProduct {
  slug: string;
  name: string;
  categorySlug: string | null;
  collectionSlugs: string[];
  description: string;
  details: string;
  status: string;
  featured: boolean;
  tags: string;
  supplierName: string;
  supplierSku: string;
  supplierUrl: string;
  supplierCost: number;
  retailPrice: number;
  compareAtPrice: number | null;
  priceOverride: boolean;
  images: string[];
  variants: {
    sku: string;
    size: string;
    color: string;
    colorHex: string;
    stock: number;
    supplierSku: string;
  }[];
}

export function productsToCsv(products: ExportableProduct[], currency: string): string {
  const rows: Row[] = [];
  for (const p of products) {
    const base: Row = {
      handle: p.slug,
      name: p.name,
      category: p.categorySlug ?? "",
      collections: p.collectionSlugs.join("|"),
      description: p.description,
      details: p.details.replace(/\n/g, "\\n"),
      status: p.status,
      featured: p.featured ? "true" : "false",
      tags: p.tags,
      supplier_name: p.supplierName,
      supplier_sku: p.supplierSku,
      supplier_url: p.supplierUrl,
      supplier_cost: toMajor(p.supplierCost, currency),
      retail_price: toMajor(p.retailPrice, currency),
      compare_at_price: p.compareAtPrice != null ? toMajor(p.compareAtPrice, currency) : "",
      price_override: p.priceOverride ? "true" : "false",
      images: p.images.join("|"),
    };
    if (p.variants.length === 0) rows.push(base);
    for (const v of p.variants) {
      rows.push({
        ...base,
        variant_sku: v.sku,
        size: v.size,
        color: v.color,
        color_hex: v.colorHex,
        stock: String(v.stock),
        variant_supplier_sku: v.supplierSku,
      });
    }
  }
  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] });
}

/** The CSV adapter has no remote API: products come from uploaded files, orders are placed manually. */
export const csvAdapter: SupplierAdapter = {
  id: "csv",
  label: "CSV / manual",
  autoPlaceEnabled: () => false,
};
