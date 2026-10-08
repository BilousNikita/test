/**
 * Pure order-total calculation. Used by the cart quote, checkout and order creation –
 * the ONLY place totals are computed. Never trust prices sent by the client.
 */
export interface TotalsLine {
  unitPrice: number; // minor units
  quantity: number;
}

export interface TotalsShipping {
  price: number;
  freeOver?: number | null;
}

export interface TotalsInput {
  lines: TotalsLine[];
  shipping?: TotalsShipping | null;
  taxRateBps: number; // 1700 = 17%
  pricesIncludeTax: boolean;
}

export interface Totals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export function shippingCost(subtotal: number, shipping?: TotalsShipping | null): number {
  if (!shipping) return 0;
  if (shipping.freeOver != null && shipping.freeOver > 0 && subtotal >= shipping.freeOver) return 0;
  return shipping.price;
}

export function calculateTotals({ lines, shipping, taxRateBps, pricesIncludeTax }: TotalsInput): Totals {
  for (const l of lines) {
    if (!Number.isInteger(l.unitPrice) || l.unitPrice < 0) throw new Error("Invalid unit price");
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new Error("Invalid quantity");
  }
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const ship = shippingCost(subtotal, shipping);
  const taxable = subtotal + ship;
  const rate = Math.max(0, taxRateBps) / 10000;

  if (pricesIncludeTax) {
    // VAT-style: prices already contain tax; extract the tax portion for display/invoices.
    const tax = Math.round(taxable - taxable / (1 + rate));
    return { subtotal, shipping: ship, tax, total: taxable };
  }
  // Sales-tax style: tax added on top.
  const tax = Math.round(taxable * rate);
  return { subtotal, shipping: ship, tax, total: taxable + tax };
}
