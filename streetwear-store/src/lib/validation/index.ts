import { z } from "zod";

const id = z.string().min(1).max(64);
const trimmed = (max: number) => z.string().trim().max(max);

export const cartItemsSchema = z
  .array(z.object({ variantId: id, quantity: z.number().int().min(1).max(10) }))
  .max(50);

export const cartQuoteSchema = z.object({
  items: cartItemsSchema,
  shippingMethodId: id.optional().nullable(),
});

export const addressSchema = z.object({
  name: trimmed(120).min(2, "Please enter your full name"),
  line1: trimmed(200).min(3, "Please enter your address"),
  line2: trimmed(200).optional().default(""),
  city: trimmed(100).min(2, "Please enter your city"),
  region: trimmed(100).optional().default(""),
  postalCode: trimmed(20).min(2, "Please enter a postal code"),
  country: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, "Choose a country"),
  phone: trimmed(40)
    .regex(/^[0-9+()\-.\s]*$/, "Invalid phone number")
    .optional()
    .default(""),
});

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  address: addressSchema,
  shippingMethodId: id,
  items: cartItemsSchema.min(1, "Your cart is empty"),
  newsletter: z.boolean().optional().default(false),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
});

export const contactSchema = z.object({
  name: trimmed(120).min(2),
  email: z.string().trim().toLowerCase().email().max(200),
  message: trimmed(5000).min(10, "Message is too short"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes")
  .max(120);

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export const SUPPLIER_ORDER_STATUSES = ["pending", "placed", "shipped", "delivered"] as const;
export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Formats zod errors into { field: message } for forms. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
