/**
 * Pure cart state helpers (client cart only stores variant ids + quantities).
 * Prices are always resolved on the server via /api/cart/quote.
 */
export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 50;

export interface CartItem {
  variantId: string;
  quantity: number;
}

const clampQty = (q: number) => Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(q)));

export function normalizeCart(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  const merged = new Map<string, number>();
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const { variantId, quantity } = raw as Record<string, unknown>;
    if (typeof variantId !== "string" || !variantId || variantId.length > 64) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) continue;
    merged.set(variantId, (merged.get(variantId) ?? 0) + quantity);
  }
  return [...merged.entries()]
    .map(([variantId, q]) => ({ variantId, quantity: clampQty(q) }))
    .filter((i) => i.quantity > 0)
    .slice(0, MAX_LINES);
}

export function addToCart(items: CartItem[], variantId: string, quantity = 1): CartItem[] {
  return normalizeCart([...items, { variantId, quantity }]);
}

export function setQuantity(items: CartItem[], variantId: string, quantity: number): CartItem[] {
  return normalizeCart(items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)));
}

export function removeFromCart(items: CartItem[], variantId: string): CartItem[] {
  return items.filter((i) => i.variantId !== variantId);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}
