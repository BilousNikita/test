import type { SupplierOrder } from "@prisma/client";

/** Normalized product coming from any supplier source (CSV, CJ, Spocket…). Money in minor units. */
export interface ImportedVariant {
  sku: string;
  size: string;
  color: string;
  colorHex?: string;
  stock: number;
  supplierSku?: string;
}

export interface ImportedProduct {
  slug: string;
  name: string;
  category?: string; // category slug or name
  collections?: string[]; // collection slugs
  description: string;
  details: string;
  status: "active" | "draft" | "archived";
  featured: boolean;
  tags: string;
  supplierName: string;
  supplierSku: string;
  supplierUrl: string;
  supplierCost: number;
  retailPrice?: number;
  compareAtPrice?: number | null;
  priceOverride: boolean;
  images: string[]; // /uploads/... paths or http(s) URLs (downloaded on import)
  variants: ImportedVariant[];
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier?: string;
  url?: string;
  status: "placed" | "shipped" | "delivered";
}

/**
 * Supplier adapter contract. Implement the optional methods your supplier supports.
 * See src/lib/suppliers/cj-dropshipping.ts for a documented example.
 */
export interface SupplierAdapter {
  readonly id: string;
  readonly label: string;
  /** True when orders should be forwarded automatically after payment (SUPPLIER_AUTO_PLACE=true + keys set). */
  autoPlaceEnabled(): boolean;
  /** Pull products from the supplier catalog (returns normalized products ready for import). */
  fetchProducts?(opts: { query?: string; page?: number }): Promise<ImportedProduct[]>;
  /** Forward a paid order to the supplier. Return the supplier's order id. */
  placeOrder?(order: SupplierOrder): Promise<{ supplierOrderRef: string }>;
  /** Poll tracking for a placed supplier order. */
  getTracking?(supplierOrderRef: string): Promise<TrackingInfo | null>;
}

export class SupplierNotConfiguredError extends Error {}
