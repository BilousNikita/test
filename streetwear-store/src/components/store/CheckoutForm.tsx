"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicQuote } from "@/lib/public-quote";
import { useStore } from "./StoreProvider";

interface Method {
  id: string;
  name: string;
  description: string;
  price: number;
  freeOver: number | null;
}

export function CheckoutForm({
  methods,
  countries,
}: {
  methods: Method[];
  countries: { code: string; name: string }[];
}) {
  const { items, ready, money, config } = useStore();
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready || items.length === 0) return;
    const ctrl = new AbortController();
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, shippingMethodId: methodId || null }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => q && setQuote(q))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [items, methodId, ready]);

  if (ready && items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="display text-4xl">Your bag is empty</p>
        <Link href="/shop" className="btn-primary mt-8">
          Continue shopping
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: get("email"),
          newsletter: fd.get("newsletter") === "on",
          shippingMethodId: methodId,
          items,
          address: {
            name: get("name"),
            line1: get("line1"),
            line2: get("line2"),
            city: get("city"),
            region: get("region"),
            postalCode: get("postalCode"),
            country: get("country"),
            phone: get("phone"),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }
      if (data.fieldErrors) setErrors(data.fieldErrors);
      setFormError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  const err = (k: string) => errors[k] && <p className="text-danger mt-1 text-xs">{errors[k]}</p>;
  const field = (
    name: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    errKey = `address.${name}`,
  ) => (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} className="input" aria-invalid={!!errors[errKey]} {...props} />
      {err(errKey)}
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="mt-10 grid gap-12 lg:grid-cols-[1fr_420px] lg:gap-16" noValidate>
      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] uppercase">1. Contact</h2>
          {field(
            "email",
            "Email",
            { type: "email", autoComplete: "email", required: true, maxLength: 200 },
            "email",
          )}
          <label className="text-muted mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="newsletter" className="accent-ink" /> Email me about new drops
          </label>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] uppercase">2. Shipping address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {field("name", "Full name", { autoComplete: "name", required: true, maxLength: 120 })}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="country" className="label">
                Country
              </label>
              <select
                id="country"
                name="country"
                className="input"
                autoComplete="country"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select country
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              {err("address.country")}
            </div>
            <div className="sm:col-span-2">
              {field("line1", "Address", { autoComplete: "address-line1", required: true, maxLength: 200 })}
            </div>
            <div className="sm:col-span-2">
              {field("line2", "Apartment, suite (optional)", {
                autoComplete: "address-line2",
                maxLength: 200,
              })}
            </div>
            {field("city", "City", { autoComplete: "address-level2", required: true, maxLength: 100 })}
            {field("region", "State / region (optional)", { autoComplete: "address-level1", maxLength: 100 })}
            {field("postalCode", "Postal code", {
              autoComplete: "postal-code",
              required: true,
              maxLength: 20,
            })}
            {field("phone", "Phone (for the courier)", { type: "tel", autoComplete: "tel", maxLength: 40 })}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] uppercase">3. Shipping method</h2>
          {methods.length === 0 && <p className="text-danger text-sm">No shipping methods configured yet.</p>}
          <div className="space-y-2">
            {methods.map((m) => {
              const free = m.freeOver != null && quote != null && quote.totals.subtotal >= m.freeOver;
              return (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center justify-between gap-4 border p-4 ${methodId === m.id ? "border-ink bg-surface" : "border-line"}`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value={m.id}
                      checked={methodId === m.id}
                      onChange={() => setMethodId(m.id)}
                      className="accent-ink"
                    />
                    <span>
                      <span className="block text-sm font-medium">{m.name}</span>
                      <span className="text-muted block text-xs">
                        {m.description}
                        {m.freeOver != null && ` · Free over ${money(m.freeOver)}`}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm">{free || m.price === 0 ? "Free" : money(m.price)}</span>
                </label>
              );
            })}
          </div>
          {err("shippingMethodId")}
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] uppercase">4. Payment</h2>
          <p className="text-muted text-sm">
            You&apos;ll be redirected to our secure payment partner to complete your purchase. We never see or
            store your card details.
          </p>
        </section>
      </div>

      <aside className="border-line bg-surface h-fit border p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] uppercase">Order summary</h2>
        <ul className="divide-line divide-y">
          {(quote?.lines ?? []).map((l) => (
            <li key={l.variantId} className="flex gap-3 py-3">
              <div className="bg-subtle relative aspect-[4/5] w-14 shrink-0">
                {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                <span className="bg-ink text-bg absolute -end-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px]">
                  {l.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{l.productName}</p>
                <p className="text-muted text-xs">{l.variantLabel}</p>
                {!l.available && (
                  <p className="text-danger text-xs">{l.stock > 0 ? `Only ${l.stock} left` : "Sold out"}</p>
                )}
              </div>
              <p className="text-sm">{money(l.lineTotal)}</p>
            </li>
          ))}
        </ul>
        {quote && (
          <dl className="border-line mt-4 space-y-2 border-t pt-4 text-sm">
            <Row label="Subtotal" value={money(quote.totals.subtotal)} />
            <Row
              label="Shipping"
              value={
                quote.shippingMethod
                  ? quote.totals.shipping === 0
                    ? "Free"
                    : money(quote.totals.shipping)
                  : "—"
              }
            />
            <Row
              label={
                config.pricesIncludeTax
                  ? `Incl. tax (${quote.taxRateBps / 100}%)`
                  : `Tax (${quote.taxRateBps / 100}%)`
              }
              value={money(quote.totals.tax)}
            />
            <div className="border-line flex justify-between border-t pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>{money(quote.totals.total)}</dd>
            </div>
          </dl>
        )}
        {formError && (
          <p role="alert" className="text-danger mt-4 text-sm">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !quote || methods.length === 0}
          className="btn-primary mt-6 w-full"
        >
          {submitting ? "Redirecting…" : "Continue to payment"}
        </button>
        <p className="text-muted mt-3 text-center text-[11px]">
          By placing your order you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </aside>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
