import { absoluteUrl } from "../env";
import type { PaymentProvider } from "./types";

/**
 * Offline test provider: redirects to a local "pay" page instead of Stripe.
 * Only for local development / automated tests – it is refused in production unless
 * ALLOW_MOCK_PAYMENTS=true is set explicitly (never do that on a live store).
 */
export const mockProvider: PaymentProvider = {
  id: "mock",
  async createCheckout(order) {
    return {
      redirectUrl: absoluteUrl(`/checkout/mock-pay?order=${order.id}&token=${order.accessToken}`),
      paymentRef: `mock_${order.id}`,
    };
  },
  async verifyPayment() {
    // Mock payments are confirmed explicitly via POST /api/payments/mock
    return { paid: false };
  },
};
