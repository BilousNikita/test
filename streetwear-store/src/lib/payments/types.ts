import type { Order, OrderItem } from "@prisma/client";

/**
 * Payment provider abstraction. To add a provider (PayPal, Tranzila, PayPlus, Mollie…):
 *  1. implement this interface in src/lib/payments/<name>.ts
 *  2. register it in getPaymentProvider() (src/lib/payments/index.ts)
 *  3. add a webhook route under src/app/api/webhooks/<name>/route.ts that calls finalizePaidOrder()
 */
export interface CheckoutSessionResult {
  redirectUrl: string;
  paymentRef: string;
}

export interface PaymentVerification {
  paid: boolean;
  paymentIntentRef?: string | null;
}

export interface PaymentProvider {
  readonly id: string;
  createCheckout(order: Order & { items: OrderItem[] }): Promise<CheckoutSessionResult>;
  /** Asks the provider whether the payment for `paymentRef` has been completed. */
  verifyPayment(paymentRef: string): Promise<PaymentVerification>;
}
