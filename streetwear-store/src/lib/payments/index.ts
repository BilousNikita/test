import { env } from "../env";
import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export function mockPaymentsAllowed() {
  const e = env();
  return e.PAYMENT_PROVIDER === "mock" && (e.NODE_ENV !== "production" || e.ALLOW_MOCK_PAYMENTS);
}

export function getPaymentProvider(id?: string): PaymentProvider {
  const wanted = id ?? env().PAYMENT_PROVIDER;
  if (wanted === "mock") {
    if (!mockPaymentsAllowed()) throw new Error("Mock payments are disabled in production");
    return mockProvider;
  }
  if (wanted === "stripe") {
    if (!env().STRIPE_SECRET_KEY) throw new Error("Payments are not configured (STRIPE_SECRET_KEY missing)");
    return stripeProvider;
  }
  throw new Error(`Unknown payment provider: ${wanted}`);
}

export type { PaymentProvider } from "./types";
