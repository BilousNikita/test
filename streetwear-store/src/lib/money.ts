/** Money helpers. All amounts are integers in MINOR units (e.g. cents). */

const fmtCache = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, locale: string) {
  const key = `${locale}|${currency}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: "currency", currency });
    fmtCache.set(key, f);
  }
  return f;
}

/** Number of minor-unit digits for a currency (USD 2, ILS 2, JPY 0). */
export function currencyDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ??
    2
  );
}

export function formatMoney(minor: number, currency: string, locale = "en-US"): string {
  const digits = currencyDigits(currency);
  return formatter(currency, locale).format(minor / 10 ** digits);
}

/** "12.50" -> 1250 (for a 2-digit currency). Returns NaN for invalid input. */
export function toMinor(major: string | number, currency: string): number {
  const n = typeof major === "number" ? major : Number(String(major).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 10 ** currencyDigits(currency));
}

export function toMajor(minor: number, currency: string): string {
  const d = currencyDigits(currency);
  return (minor / 10 ** d).toFixed(d);
}
