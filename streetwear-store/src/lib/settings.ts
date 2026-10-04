import { z } from "zod";
import { db } from "./db";
import { env } from "./env";

/**
 * Store settings = env defaults overridden by values saved in the admin Settings page (DB).
 * Note: changing the currency only changes the label/format – prices are not converted.
 */
export const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  logoUrl: z.string().max(500).nullable(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "3-letter ISO code, e.g. USD, EUR, ILS")
    .transform((v) => v.toUpperCase()),
  taxRateBps: z.number().int().min(0).max(5000),
  pricesIncludeTax: z.boolean(),
  markup: z.number().min(1).max(20),
  contactEmail: z.string().trim().email(),
  announcement: z.string().trim().max(160),
});

export type StoreSettings = z.infer<typeof settingsSchema> & {
  locale: string;
  direction: "ltr" | "rtl";
  lowStockThreshold: number;
};

function defaults(): StoreSettings {
  const e = env();
  return {
    storeName: e.STORE_NAME,
    logoUrl: null,
    currency: e.CURRENCY,
    taxRateBps: Math.round(e.TAX_RATE * 10000),
    pricesIncludeTax: e.PRICES_INCLUDE_TAX,
    markup: e.PRICE_MARKUP,
    contactEmail: e.CONTACT_EMAIL,
    announcement: "Free worldwide shipping on orders over $150",
    locale: e.LOCALE,
    direction: e.TEXT_DIRECTION,
    lowStockThreshold: e.LOW_STOCK_THRESHOLD,
  };
}

const KEY = "store";
let cache: { at: number; value: StoreSettings } | null = null;
const TTL = 5_000;

export async function getSettings(): Promise<StoreSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const base = defaults();
  let value = base;
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    if (row) {
      const parsed = settingsSchema.partial().safeParse(JSON.parse(row.value));
      if (parsed.success) value = { ...base, ...stripUndefined(parsed.data) };
    }
  } catch (err) {
    console.error("[settings] failed to load settings, using env defaults", err);
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(input: Partial<z.infer<typeof settingsSchema>>) {
  const current = await db.setting.findUnique({ where: { key: KEY } });
  const merged = { ...(current ? JSON.parse(current.value) : {}), ...input };
  const value = JSON.stringify(settingsSchema.partial().parse(merged));
  await db.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  cache = null;
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
