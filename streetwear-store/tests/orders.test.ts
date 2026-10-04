import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  CheckoutError,
  createPendingOrder,
  finalizePaidOrder,
  quoteCart,
  updateTracking,
} from "@/lib/orders";
import type { CheckoutInput } from "@/lib/validation";

let variantA: string;
let variantB: string;
let soldOut: string;
let shippingId: string;

const address = {
  name: "Test Buyer",
  line1: "1 Test St",
  line2: "",
  city: "Tel Aviv",
  region: "",
  postalCode: "6100000",
  country: "IL",
  phone: "",
};

beforeAll(async () => {
  const cat = await db.category.create({ data: { name: "Tees", slug: "tees" } });
  const p1 = await db.product.create({
    data: {
      name: "Box Tee",
      slug: "box-tee",
      status: "active",
      categoryId: cat.id,
      supplierName: "Supplier A",
      supplierSku: "SA-1",
      supplierCost: 1000,
      retailPrice: 2900,
      margin: 1900,
      variants: {
        create: [
          { sku: "BT-BLK-M", size: "M", color: "Black", stock: 5 },
          { sku: "BT-BLK-L", size: "L", color: "Black", stock: 0 },
        ],
      },
    },
    include: { variants: true },
  });
  const p2 = await db.product.create({
    data: {
      name: "Hoodie",
      slug: "hoodie",
      status: "active",
      supplierName: "Supplier B",
      supplierCost: 2500,
      retailPrice: 6500,
      margin: 4000,
      variants: { create: [{ sku: "HD-GRY-M", size: "M", color: "Grey", stock: 2 }] },
    },
    include: { variants: true },
  });
  variantA = p1.variants.find((v) => v.size === "M")!.id;
  soldOut = p1.variants.find((v) => v.size === "L")!.id;
  variantB = p2.variants[0]!.id;
  shippingId = (await db.shippingMethod.create({ data: { name: "Standard", price: 800, freeOver: 50000 } }))
    .id;
});

afterAll(async () => {
  await db.$disconnect();
});

const input = (items: CheckoutInput["items"]): CheckoutInput => ({
  email: "buyer@example.com",
  address,
  shippingMethodId: shippingId,
  items,
  newsletter: false,
});

describe("order creation", () => {
  it("quotes using database prices only", async () => {
    const q = await quoteCart(
      [
        { variantId: variantA, quantity: 2 },
        { variantId: "does-not-exist", quantity: 1 },
      ],
      shippingId,
    );
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]!.unitPrice).toBe(2900);
    expect(q.issues).toHaveLength(1);
    expect(q.totals).toEqual({
      subtotal: 5800,
      shipping: 800,
      tax: Math.round(6600 - 6600 / 1.17),
      total: 6600,
    });
  });

  it("creates a pending order with server-side totals", async () => {
    // A malicious client might send extra fields like prices – they are not part of the schema and are ignored.
    const order = await createPendingOrder(
      input([
        { variantId: variantA, quantity: 2, unitPrice: 1 } as never,
        { variantId: variantB, quantity: 1 },
      ]),
      "mock",
    );
    expect(order.status).toBe("pending");
    expect(order.subtotal).toBe(2 * 2900 + 6500);
    expect(order.shippingCost).toBe(800);
    expect(order.total).toBe(12300 + 800);
    expect(order.items).toHaveLength(2);
    expect(order.items.find((i) => i.variantId === variantA)!.supplierCost).toBe(1000);
    expect(order.accessToken.length).toBeGreaterThan(20);
  });

  it("rejects sold-out and over-stock quantities", async () => {
    await expect(
      createPendingOrder(input([{ variantId: soldOut, quantity: 1 }]), "mock"),
    ).rejects.toBeInstanceOf(CheckoutError);
    await expect(createPendingOrder(input([{ variantId: variantB, quantity: 3 }]), "mock")).rejects.toThrow(
      /Only 2 left/,
    );
  });

  it("rejects an invalid shipping method", async () => {
    await expect(
      createPendingOrder(
        { ...input([{ variantId: variantA, quantity: 1 }]), shippingMethodId: "nope" },
        "mock",
      ),
    ).rejects.toThrow(/shipping/i);
  });

  it("finalizes a paid order once: stock, supplier orders, email", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const order = await createPendingOrder(
      input([
        { variantId: variantA, quantity: 1 },
        { variantId: variantB, quantity: 1 },
      ]),
      "mock",
    );
    const stockBefore = (await db.variant.findUniqueOrThrow({ where: { id: variantA } })).stock;

    const first = await finalizePaidOrder(order.id, { paymentIntentRef: "pi_test" });
    const second = await finalizePaidOrder(order.id, { paymentIntentRef: "pi_test" });
    expect(first.finalized).toBe(true);
    expect(second.finalized).toBe(false); // idempotent (webhook + success page)

    const paid = await db.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { supplierOrders: true },
    });
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).not.toBeNull();
    expect(paid.confirmationSentAt).not.toBeNull();
    expect(paid.supplierOrders.map((s) => s.supplierName).sort()).toEqual(["Supplier A", "Supplier B"]);
    const so = paid.supplierOrders.find((s) => s.supplierName === "Supplier A")!;
    expect(so.status).toBe("pending");
    expect(JSON.parse(so.shippingSnapshot)).toMatchObject({
      name: "Test Buyer",
      country: "IL",
      email: "buyer@example.com",
    });
    expect(JSON.parse(so.itemsSnapshot)[0]).toMatchObject({
      sku: "BT-BLK-M",
      quantity: 1,
      supplierCost: 1000,
    });

    expect((await db.variant.findUniqueOrThrow({ where: { id: variantA } })).stock).toBe(stockBefore - 1);
    expect(log.mock.calls.flat().join(" ")).toContain(`Order ${order.orderNumber} confirmed`);

    // tracking -> shipped + shipping email
    const { order: shipped, emailed } = await updateTracking(order.id, {
      trackingNumber: "TRACK123",
      trackingCarrier: "DHL",
    });
    expect(shipped.status).toBe("shipped");
    expect(emailed).toBe(true);
    expect(log.mock.calls.flat().join(" ")).toContain("TRACK123");
    log.mockRestore();
  });
});
