"use client";

import { useEffect } from "react";
import { useStore } from "./StoreProvider";

/** Empties the cart once the order is confirmed. */
export function ClearCart() {
  const { clear, ready } = useStore();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
