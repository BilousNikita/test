import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartCount,
  MAX_QTY_PER_LINE,
  normalizeCart,
  removeFromCart,
  setQuantity,
} from "@/lib/cart";

describe("cart", () => {
  it("adds items and merges duplicates", () => {
    let c = addToCart([], "v1", 1);
    c = addToCart(c, "v1", 2);
    c = addToCart(c, "v2");
    expect(c).toEqual([
      { variantId: "v1", quantity: 3 },
      { variantId: "v2", quantity: 1 },
    ]);
    expect(cartCount(c)).toBe(4);
  });

  it("clamps quantity and removes zero lines", () => {
    let c = addToCart([], "v1", 50);
    expect(c[0]!.quantity).toBe(MAX_QTY_PER_LINE);
    c = setQuantity(c, "v1", 0);
    expect(c).toEqual([]);
  });

  it("removes items", () => {
    const c = removeFromCart(addToCart(addToCart([], "a"), "b"), "a");
    expect(c.map((i) => i.variantId)).toEqual(["b"]);
  });

  it("sanitizes untrusted localStorage data", () => {
    expect(normalizeCart("garbage")).toEqual([]);
    expect(
      normalizeCart([
        { variantId: "ok", quantity: 2.7 },
        { variantId: 5, quantity: 1 },
        null,
        { variantId: "x", quantity: NaN },
        { variantId: "neg", quantity: -3 },
      ]),
    ).toEqual([{ variantId: "ok", quantity: 2 }]);
  });
});
