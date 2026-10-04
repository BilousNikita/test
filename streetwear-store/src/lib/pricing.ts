import { currencyDigits } from "./money";

/**
 * Automatic price rule: retailPrice = supplierCost * markup, rounded UP to a whole major unit
 * (e.g. 27.31 -> 28.00). A product with `priceOverride = true` keeps its manual retail price.
 */
export function priceFromCost(supplierCost: number, markup: number, currency: string): number {
  if (supplierCost <= 0) return 0;
  const unit = 10 ** currencyDigits(currency);
  return Math.ceil((supplierCost * markup) / unit) * unit;
}

export interface PricingInput {
  supplierCost: number;
  retailPrice: number;
  priceOverride: boolean;
}

export function applyPricing(p: PricingInput, markup: number, currency: string) {
  const retailPrice = p.priceOverride ? p.retailPrice : priceFromCost(p.supplierCost, markup, currency);
  return { retailPrice, margin: retailPrice - p.supplierCost };
}

/** Margin as a percentage of the retail price (0–100). */
export function marginPercent(retailPrice: number, supplierCost: number): number {
  if (retailPrice <= 0) return 0;
  return Math.round(((retailPrice - supplierCost) / retailPrice) * 1000) / 10;
}
