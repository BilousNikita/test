import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { calculateTotals, type Totals } from "./totals";
import { getSettings, type StoreSettings } from "./settings";
import type { CartItem } from "./cart";
import type { CheckoutInput } from "./validation";
import { sendMailSafe } from "./mailer";
import { orderConfirmationEmail, shippingUpdateEmail } from "./mailer/templates";
import { getSupplierAdapter } from "./suppliers";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly code: "EMPTY" | "UNAVAILABLE" | "STOCK" | "SHIPPING" = "UNAVAILABLE",
  ) {
    super(message);
  }
}

export interface QuoteLine {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  size: string;
  color: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
  available: boolean;
  supplierName: string;
  supplierSku: string;
  supplierCost: number;
}

export interface Quote {
  lines: QuoteLine[];
  totals: Totals;
  currency: string;
  pricesIncludeTax: boolean;
  taxRateBps: number;
  shippingMethod: { id: string; name: string; price: number; freeOver: number | null } | null;
  issues: string[];
}

/**
 * Resolves a client cart (variant ids + quantities) into priced lines using ONLY database prices.
 * Unknown/inactive variants are dropped and reported in `issues`.
 */
export async function quoteCart(
  items: CartItem[],
  shippingMethodId?: string | null,
  settings?: StoreSettings,
): Promise<Quote> {
  const s = settings ?? (await getSettings());
  const ids = [...new Set(items.map((i) => i.variantId))];
  const variants = ids.length
    ? await db.variant.findMany({
        where: { id: { in: ids } },
        include: {
          product: { include: { images: { orderBy: { position: "asc" } } } },
        },
      })
    : [];
  const byId = new Map(variants.map((v) => [v.id, v]));
  const issues: string[] = [];
  const lines: QuoteLine[] = [];

  for (const item of items) {
    const v = byId.get(item.variantId);
    if (!v || v.product.status !== "active") {
      issues.push("An item in your cart is no longer available and was removed.");
      continue;
    }
    const img = v.product.images.find((i) => i.color === v.color) ?? v.product.images[0];
    const unitPrice = v.product.retailPrice;
    lines.push({
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantLabel: [v.color, v.size].filter(Boolean).join(" / "),
      size: v.size,
      color: v.color,
      sku: v.sku,
      imageUrl: img?.url ?? null,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      stock: v.stock,
      available: v.stock >= item.quantity,
      supplierName: v.product.supplierName,
      supplierSku: v.supplierSku || v.product.supplierSku,
      supplierCost: v.product.supplierCost,
    });
  }

  let shippingMethod: Quote["shippingMethod"] = null;
  if (shippingMethodId) {
    const m = await db.shippingMethod.findFirst({ where: { id: shippingMethodId, active: true } });
    if (m) shippingMethod = { id: m.id, name: m.name, price: m.price, freeOver: m.freeOver };
  }

  const totals = calculateTotals({
    lines,
    shipping: shippingMethod,
    taxRateBps: s.taxRateBps,
    pricesIncludeTax: s.pricesIncludeTax,
  });

  return {
    lines,
    totals,
    currency: s.currency,
    pricesIncludeTax: s.pricesIncludeTax,
    taxRateBps: s.taxRateBps,
    shippingMethod,
    issues,
  };
}

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `SA-${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Creates an order in `pending` state with server-calculated prices. */
export async function createPendingOrder(input: CheckoutInput, paymentProvider: string) {
  const settings = await getSettings();
  const quote = await quoteCart(input.items, input.shippingMethodId, settings);
  if (quote.lines.length === 0) throw new CheckoutError("Your cart is empty.", "EMPTY");
  if (quote.issues.length) throw new CheckoutError(quote.issues[0]!, "UNAVAILABLE");
  const short = quote.lines.find((l) => !l.available);
  if (short) {
    throw new CheckoutError(
      short.stock > 0
        ? `Only ${short.stock} left of ${short.productName} (${short.variantLabel}).`
        : `${short.productName} (${short.variantLabel}) is sold out.`,
      "STOCK",
    );
  }
  if (!quote.shippingMethod) throw new CheckoutError("Please choose a shipping method.", "SHIPPING");

  const a = input.address;
  return db.order.create({
    data: {
      orderNumber: orderNumber(),
      accessToken: crypto.randomBytes(24).toString("base64url"),
      email: input.email,
      status: "pending",
      paymentProvider,
      currency: quote.currency,
      subtotal: quote.totals.subtotal,
      shippingCost: quote.totals.shipping,
      taxAmount: quote.totals.tax,
      taxRateBps: quote.taxRateBps,
      pricesIncludeTax: quote.pricesIncludeTax,
      total: quote.totals.total,
      shippingMethodId: quote.shippingMethod.id,
      shippingMethodName: quote.shippingMethod.name,
      shipName: a.name,
      shipLine1: a.line1,
      shipLine2: a.line2 ?? "",
      shipCity: a.city,
      shipRegion: a.region ?? "",
      shipPostalCode: a.postalCode,
      shipCountry: a.country,
      shipPhone: a.phone ?? "",
      items: {
        create: quote.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          variantLabel: l.variantLabel,
          sku: l.sku,
          imageUrl: l.imageUrl,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
          supplierName: l.supplierName,
          supplierSku: l.supplierSku,
          supplierCost: l.supplierCost,
        })),
      },
    },
    include: { items: true },
  });
}

/**
 * Marks an order as paid – idempotent (safe to call from the webhook AND the success page).
 * In one transaction: pending -> paid, stock decrement, one SupplierOrder per supplier.
 * Then sends the confirmation email (and optionally forwards to the supplier API).
 */
export async function finalizePaidOrder(orderId: string, payment: { paymentIntentRef?: string | null } = {}) {
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "pending" },
      data: { status: "paid", paidAt: new Date(), paymentIntentRef: payment.paymentIntentRef ?? undefined },
    });
    if (updated.count === 0) return null; // already finalized (or not found)

    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });

    for (const item of order.items) {
      if (item.variantId) {
        await tx.variant.updateMany({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    const productIds = order.items.map((i) => i.productId).filter((x): x is string => !!x);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, supplierUrl: true },
    });
    const urlById = new Map(products.map((p) => [p.id, p.supplierUrl]));

    const bySupplier = new Map<string, typeof order.items>();
    for (const item of order.items) {
      const key = item.supplierName || "Unassigned supplier";
      bySupplier.set(key, [...(bySupplier.get(key) ?? []), item]);
    }
    const shippingSnapshot = JSON.stringify({
      name: order.shipName,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      region: order.shipRegion,
      postalCode: order.shipPostalCode,
      country: order.shipCountry,
      phone: order.shipPhone,
      email: order.email,
    });
    for (const [supplierName, items] of bySupplier) {
      await tx.supplierOrder.create({
        data: {
          orderId: order.id,
          supplierName,
          status: "pending",
          shippingSnapshot,
          itemsSnapshot: JSON.stringify(
            items.map((i) => ({
              supplierSku: i.supplierSku,
              sku: i.sku,
              name: i.productName,
              variant: i.variantLabel,
              quantity: i.quantity,
              supplierCost: i.supplierCost,
              supplierUrl: (i.productId && urlById.get(i.productId)) || "",
            })),
          ),
        },
      });
    }
    return order;
  });

  if (!result) return { finalized: false as const };

  const settings = await getSettings();
  const sent = await sendMailSafe(orderConfirmationEmail(result, settings));
  if (sent) await db.order.update({ where: { id: result.id }, data: { confirmationSentAt: new Date() } });

  // Optional: forward automatically to a supplier API (e.g. CJ) when configured.
  await autoPlaceSupplierOrders(result.id).catch((err) =>
    console.error("[suppliers] auto-place failed", err),
  );

  return { finalized: true as const, order: result };
}

async function autoPlaceSupplierOrders(orderId: string) {
  const adapter = getSupplierAdapter();
  if (!adapter.autoPlaceEnabled() || !adapter.placeOrder) return;
  const supplierOrders = await db.supplierOrder.findMany({ where: { orderId, status: "pending" } });
  for (const so of supplierOrders) {
    const { supplierOrderRef } = await adapter.placeOrder(so);
    await db.supplierOrder.update({ where: { id: so.id }, data: { status: "placed", supplierOrderRef } });
  }
}

/** Saves tracking info and emails the customer when a (new) tracking number is added. */
export async function updateTracking(
  orderId: string,
  data: { trackingNumber: string; trackingCarrier?: string; trackingUrl?: string; notify?: boolean },
) {
  const before = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const patch: Prisma.OrderUpdateInput = {
    trackingNumber: data.trackingNumber || null,
    trackingCarrier: data.trackingCarrier || null,
    trackingUrl: data.trackingUrl || null,
  };
  if (data.trackingNumber && ["paid", "processing"].includes(before.status)) {
    patch.status = "shipped";
    patch.shippedAt = new Date();
  }
  const order = await db.order.update({ where: { id: orderId }, data: patch });
  const changed = data.trackingNumber && data.trackingNumber !== before.trackingNumber;
  let emailed = false;
  if (changed && data.notify !== false) {
    emailed = await sendMailSafe(shippingUpdateEmail(order, await getSettings()));
  }
  return { order, emailed };
}
