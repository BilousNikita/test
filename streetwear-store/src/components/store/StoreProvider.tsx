"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addToCart, cartCount, normalizeCart, removeFromCart, setQuantity, type CartItem } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import type { PublicQuote } from "@/lib/public-quote";

export interface StoreConfig {
  storeName: string;
  currency: string;
  locale: string;
  pricesIncludeTax: boolean;
}

interface CartContextValue {
  config: StoreConfig;
  money: (minor: number) => string;
  items: CartItem[];
  count: number;
  ready: boolean;
  quote: PublicQuote | null;
  quoting: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (variantId: string, quantity?: number) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "sa_cart_v1";

export function StoreProvider({ config, children }: { config: StoreConfig; children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const reqId = useRef(0);

  // load persisted cart
  useEffect(() => {
    try {
      setItems(normalizeCart(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")));
    } catch {
      setItems([]);
    }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          setItems(normalizeCart(JSON.parse(e.newValue ?? "[]")));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // persist + refresh server quote
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* private mode */
    }
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    const id = ++reqId.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error("quote failed");
        const q = (await res.json()) as PublicQuote;
        if (id !== reqId.current) return;
        setQuote(q);
        // drop items the server no longer knows about
        const known = new Set(q.lines.map((l) => l.variantId));
        if (items.some((i) => !known.has(i.variantId)))
          setItems((cur) => cur.filter((i) => known.has(i.variantId)));
      } catch {
        /* keep previous quote */
      } finally {
        if (id === reqId.current) setQuoting(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [items, ready]);

  const add = useCallback((variantId: string, quantity = 1) => {
    setItems((cur) => addToCart(cur, variantId, quantity));
    setOpen(true);
  }, []);
  const setQty = useCallback(
    (variantId: string, q: number) => setItems((cur) => setQuantity(cur, variantId, q)),
    [],
  );
  const remove = useCallback((variantId: string) => setItems((cur) => removeFromCart(cur, variantId)), []);
  const clear = useCallback(() => setItems([]), []);
  const money = useCallback((m: number) => formatMoney(m, config.currency, config.locale), [config]);

  const value = useMemo<CartContextValue>(
    () => ({
      config,
      money,
      items,
      count: cartCount(items),
      ready,
      quote,
      quoting,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQty,
      remove,
      clear,
    }),
    [config, money, items, ready, quote, quoting, isOpen, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useStore() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
