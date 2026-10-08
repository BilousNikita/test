import { describe, expect, it } from "vitest";
import { applyPricing, marginPercent, priceFromCost } from "@/lib/pricing";
import { calculateTotals } from "@/lib/totals";
import { formatMoney, toMajor, toMinor } from "@/lib/money";
import { parseProductsCsv, productsToCsv } from "@/lib/suppliers/csv";

describe("calculateTotals", () => {
  const lines = [
    { unitPrice: 2900, quantity: 2 },
    { unitPrice: 6500, quantity: 1 },
  ];

  it("extracts VAT when prices include tax", () => {
    const t = calculateTotals({ lines, shipping: { price: 800 }, taxRateBps: 1700, pricesIncludeTax: true });
    expect(t.subtotal).toBe(12300);
    expect(t.shipping).toBe(800);
    expect(t.total).toBe(13100);
    expect(t.tax).toBe(Math.round(13100 - 13100 / 1.17)); // 1903
  });

  it("adds sales tax on top when prices exclude tax", () => {
    const t = calculateTotals({ lines, shipping: { price: 800 }, taxRateBps: 1000, pricesIncludeTax: false });
    expect(t.tax).toBe(1310);
    expect(t.total).toBe(13100 + 1310);
  });

  it("applies free shipping thresholds", () => {
    const t = calculateTotals({
      lines,
      shipping: { price: 800, freeOver: 12000 },
      taxRateBps: 0,
      pricesIncludeTax: true,
    });
    expect(t.shipping).toBe(0);
    expect(t.total).toBe(12300);
  });

  it("handles empty carts and no shipping", () => {
    expect(calculateTotals({ lines: [], taxRateBps: 1700, pricesIncludeTax: true })).toEqual({
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
    });
  });

  it("rejects invalid input", () => {
    expect(() =>
      calculateTotals({ lines: [{ unitPrice: 10.5, quantity: 1 }], taxRateBps: 0, pricesIncludeTax: true }),
    ).toThrow();
    expect(() =>
      calculateTotals({ lines: [{ unitPrice: 100, quantity: 0 }], taxRateBps: 0, pricesIncludeTax: true }),
    ).toThrow();
  });
});

describe("pricing rules", () => {
  it("applies markup and rounds up to a whole unit", () => {
    expect(priceFromCost(1150, 2.5, "USD")).toBe(2900); // 28.75 -> 29.00
    expect(priceFromCost(1000, 2, "JPY")).toBe(2000); // zero-decimal currency
  });
  it("respects manual override", () => {
    expect(applyPricing({ supplierCost: 1000, retailPrice: 4500, priceOverride: true }, 2.5, "USD")).toEqual({
      retailPrice: 4500,
      margin: 3500,
    });
    expect(applyPricing({ supplierCost: 1000, retailPrice: 4500, priceOverride: false }, 2.5, "USD")).toEqual(
      { retailPrice: 2500, margin: 1500 },
    );
    expect(marginPercent(2500, 1000)).toBe(60);
  });
});

describe("money", () => {
  it("converts and formats minor units", () => {
    expect(toMinor("12.50", "USD")).toBe(1250);
    expect(toMajor(1250, "ILS")).toBe("12.50");
    expect(formatMoney(1250, "USD", "en-US")).toBe("$12.50");
  });
});

describe("CSV adapter", () => {
  it("round-trips products", () => {
    const csv = productsToCsv(
      [
        {
          slug: "tee",
          name: "Tee",
          categorySlug: "t-shirts",
          collectionSlugs: [],
          description: "Soft, heavy",
          details: "a\nb",
          status: "active",
          featured: true,
          tags: "tee",
          supplierName: "CJ",
          supplierSku: "X1",
          supplierUrl: "",
          supplierCost: 1000,
          retailPrice: 2500,
          compareAtPrice: null,
          priceOverride: false,
          images: ["/uploads/a.webp"],
          variants: [
            { sku: "X1-BLK-S", size: "S", color: "Black", colorHex: "#000000", stock: 3, supplierSku: "v1" },
            { sku: "X1-BLK-M", size: "M", color: "Black", colorHex: "#000000", stock: 0, supplierSku: "v2" },
          ],
        },
      ],
      "USD",
    );
    const { products, errors } = parseProductsCsv(csv, "USD");
    expect(errors).toEqual([]);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      slug: "tee",
      supplierCost: 1000,
      details: "a\nb",
      featured: true,
      images: ["/uploads/a.webp"],
    });
    expect(products[0]!.variants.map((v) => v.sku)).toEqual(["X1-BLK-S", "X1-BLK-M"]);
  });

  it("handles mixed line endings and auto-pricing rows", () => {
    const header = "handle,name,supplier_cost,variant_sku,size,color,stock";
    const csv = `${header}\r\na,Alpha,10.00,A-1,M,Black,3\nb,Beta,4.20,B-1,One Size,White,9\n`;
    const { products, errors } = parseProductsCsv(csv, "USD");
    expect(errors).toEqual([]);
    expect(products.map((p) => p.slug)).toEqual(["a", "b"]);
    expect(products[1]).toMatchObject({ supplierCost: 420, retailPrice: undefined, priceOverride: false });
  });
});
