import type { Quote } from "./orders";

/** Quote shape that is safe to send to browsers (no supplier cost/sku data). */
export interface PublicQuote {
  lines: {
    variantId: string;
    productName: string;
    productSlug: string;
    variantLabel: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    stock: number;
    available: boolean;
  }[];
  totals: Quote["totals"];
  currency: string;
  pricesIncludeTax: boolean;
  taxRateBps: number;
  shippingMethod: { id: string; name: string } | null;
  issues: string[];
}

export function toPublicQuote(q: Quote): PublicQuote {
  return {
    lines: q.lines.map((l) => ({
      variantId: l.variantId,
      productName: l.productName,
      productSlug: l.productSlug,
      variantLabel: l.variantLabel,
      imageUrl: l.imageUrl,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
      stock: Math.min(l.stock, 99),
      available: l.available,
    })),
    totals: q.totals,
    currency: q.currency,
    pricesIncludeTax: q.pricesIncludeTax,
    taxRateBps: q.taxRateBps,
    shippingMethod: q.shippingMethod ? { id: q.shippingMethod.id, name: q.shippingMethod.name } : null,
    issues: q.issues,
  };
}
