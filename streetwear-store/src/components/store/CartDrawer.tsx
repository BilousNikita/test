"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useStore } from "./StoreProvider";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";

export function CartDrawer() {
  const { isOpen, close, items, quote, money, setQty, remove, quoting, count, config } = useStore();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  const lines = quote?.lines ?? [];
  const hasStockIssue = lines.some((l) => !l.available);

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`} inert={!isOpen}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={`bg-surface ease-brand absolute inset-y-0 end-0 flex w-full max-w-md flex-col shadow-2xl transition-transform duration-500 ${
          isOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <header className="border-line flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase">Bag ({count})</h2>
          <button onClick={close} className="-me-2 p-2" aria-label="Close bag">
            <CloseIcon />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
            <p className="display text-4xl">Your bag is empty</p>
            <Link href="/shop" onClick={close} className="btn-primary">
              Shop new arrivals
            </Link>
          </div>
        ) : (
          <>
            <ul
              className={`divide-line flex-1 divide-y overflow-y-auto px-5 ${quoting && !quote ? "opacity-50" : ""}`}
            >
              {lines.map((l) => (
                <li key={l.variantId} className="flex gap-4 py-5">
                  <Link
                    href={`/product/${l.productSlug}`}
                    onClick={close}
                    className="bg-subtle relative aspect-[4/5] w-24 shrink-0 overflow-hidden"
                  >
                    {l.imageUrl && (
                      <Image
                        src={l.imageUrl}
                        alt={l.productName}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${l.productSlug}`}
                          onClick={close}
                          className="block truncate text-sm font-medium"
                        >
                          {l.productName}
                        </Link>
                        <p className="text-muted text-xs">{l.variantLabel}</p>
                      </div>
                      <p className="text-sm whitespace-nowrap">{money(l.lineTotal)}</p>
                    </div>
                    {!l.available && (
                      <p className="text-danger mt-1 text-xs">
                        {l.stock > 0
                          ? `Only ${l.stock} left – please reduce quantity`
                          : "Sold out – please remove"}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="border-line flex items-center border">
                        <button
                          className="p-2 disabled:opacity-30"
                          onClick={() => setQty(l.variantId, l.quantity - 1)}
                          aria-label="Decrease quantity"
                          disabled={l.quantity <= 1}
                        >
                          <MinusIcon width={14} height={14} />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                        <button
                          className="p-2 disabled:opacity-30"
                          onClick={() => setQty(l.variantId, l.quantity + 1)}
                          aria-label="Increase quantity"
                          disabled={l.quantity >= Math.min(10, l.stock)}
                        >
                          <PlusIcon width={14} height={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => remove(l.variantId)}
                        className="text-muted text-xs underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-line space-y-4 border-t px-5 py-5">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">{quote ? money(quote.totals.subtotal) : "…"}</span>
              </div>
              <p className="text-muted text-xs">
                Shipping calculated at checkout.{" "}
                {config.pricesIncludeTax ? "Prices include tax." : "Taxes added at checkout."}
              </p>
              <Link
                href="/checkout"
                onClick={close}
                aria-disabled={hasStockIssue}
                className={`btn-primary w-full ${hasStockIssue ? "pointer-events-none opacity-50" : ""}`}
              >
                Checkout
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
