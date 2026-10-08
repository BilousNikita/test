import { z } from "zod";

/**
 * Central, validated access to environment variables.
 * Everything is read at RUNTIME (never baked into the client bundle) so the same build works
 * on a bare IP and later on a real domain – only SITE_URL has to change.
 */
const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) =>
      v === undefined || v === "" ? def : ["1", "true", "yes", "on"].includes(v.toLowerCase()),
    );

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform((v) => v.replace(/\/+$/, "")),
  STORE_NAME: z.string().min(1).default("SOFT ARMOR"),
  CURRENCY: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .default("USD")
    .transform((v) => v.toUpperCase()),
  LOCALE: z.string().default("en-US"),
  TEXT_DIRECTION: z.enum(["ltr", "rtl"]).default("ltr"),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  PRICES_INCLUDE_TAX: bool(true),
  PRICE_MARKUP: z.coerce.number().min(1).max(20).default(2.5),
  LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).default(5),
  CONTACT_EMAIL: z.string().email().default("hello@example.com"),

  PAYMENT_PROVIDER: z.enum(["stripe", "mock"]).default("stripe"),
  ALLOW_MOCK_PAYMENTS: bool(false),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  MAIL_TRANSPORT: z.enum(["console", "smtp"]).default("console"),
  MAIL_FROM: z.string().default("SOFT ARMOR <no-reply@example.com>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  SESSION_SECRET: z.string().min(16).default("dev-only-insecure-session-secret"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_MB: z.coerce.number().default(8),

  SUPPLIER_ADAPTER: z.enum(["csv", "cj", "spocket"]).default("csv"),
  SUPPLIER_AUTO_PLACE: bool(false),
  CJ_API_KEY: z.string().optional(),
  CJ_API_EMAIL: z.string().optional(),
  SPOCKET_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (parsed.data.NODE_ENV === "production" && /dev-only|change-me/.test(parsed.data.SESSION_SECRET)) {
    console.warn("[env] WARNING: SESSION_SECRET is not set – set a long random value in production!");
  }
  cached = parsed.data;
  return cached;
}

export const isHttps = () => env().SITE_URL.startsWith("https://");

/** Absolute URL for a path, based on SITE_URL. */
export const absoluteUrl = (path = "/") => `${env().SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
