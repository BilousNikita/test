import { describe, expect, it, vi } from "vitest";

const create = vi.fn(async (params: unknown) => ({
  id: "cs_test_123",
  url: "https://checkout.stripe.com/c/pay/cs_test_123",
  params,
}));
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({ checkout: { sessions: { create, retrieve: vi.fn() } } })),
}));
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

const { stripeProvider } = await import("@/lib/payments/stripe");

type Params = {
  line_items: { quantity: number; price_data: { unit_amount: number; currency: string } }[];
  shipping_options: { shipping_rate_data: { fixed_amount: { amount: number } } }[];
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
};

function order(pricesIncludeTax: boolean) {
  const subtotal = 2 * 2900 + 6500;
  const shippingCost = 800;
  const taxAmount = pricesIncludeTax
    ? Math.round(subtotal + shippingCost - (subtotal + shippingCost) / 1.17)
    : Math.round((subtotal + shippingCost) * 0.1);
  return {
    id: "ord_1",
    orderNumber: "SA-1",
    accessToken: "tok",
    email: "a@b.co",
    currency: "USD",
    subtotal,
    shippingCost,
    taxAmount,
    taxRateBps: pricesIncludeTax ? 1700 : 1000,
    pricesIncludeTax,
    total: subtotal + shippingCost + (pricesIncludeTax ? 0 : taxAmount),
    shippingMethodName: "Standard",
    items: [
      { productName: "Tee", variantLabel: "Black / M", unitPrice: 2900, quantity: 2 },
      { productName: "Hoodie", variantLabel: "Grey / L", unitPrice: 6500, quantity: 1 },
    ],
  } as never;
}

const sum = (p: Params) =>
  p.line_items.reduce((s, l) => s + l.price_data.unit_amount * l.quantity, 0) +
  p.shipping_options[0]!.shipping_rate_data.fixed_amount.amount;

describe("Stripe checkout session", () => {
  it.each([true, false])("charges exactly the order total (pricesIncludeTax=%s)", async (inclusive) => {
    create.mockClear();
    const o = order(inclusive) as { total: number };
    const res = await stripeProvider.createCheckout(order(inclusive));
    const params = create.mock.calls[0]![0] as Params;
    expect(sum(params)).toBe(o.total);
    expect(params.line_items.every((l) => l.price_data.currency === "usd")).toBe(true);
    expect(params.success_url).toMatch(
      /^http:\/\/localhost:3000\/checkout\/success\?order=ord_1&token=tok&session_id=\{CHECKOUT_SESSION_ID\}$/,
    );
    expect(params.cancel_url).toBe("http://localhost:3000/checkout?canceled=1");
    expect(params.metadata.orderId).toBe("ord_1");
    expect(res).toEqual({
      redirectUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      paymentRef: "cs_test_123",
    });
  });
});
