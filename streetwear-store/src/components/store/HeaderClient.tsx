"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "./StoreProvider";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/icons";

export function CartButton() {
  const { open, count, ready } = useStore();
  return (
    <button
      onClick={open}
      className="relative -me-2 flex items-center gap-2 p-2"
      aria-label={`Open bag, ${count} items`}
    >
      <BagIcon />
      <span className="hidden text-xs font-semibold tracking-[0.15em] uppercase sm:inline">Bag</span>
      {ready && count > 0 && (
        <span className="bg-accent text-accent-ink absolute -end-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold sm:static">
          {count}
        </span>
      )}
    </button>
  );
}

export function SearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="p-2" aria-label="Search" aria-expanded={open}>
        <SearchIcon />
      </button>
      {open && (
        <div className="animate-fade-in border-line bg-bg absolute inset-x-0 top-full border-b">
          <form action="/search" className="container-x flex items-center gap-3 py-4">
            <SearchIcon className="text-muted" />
            <input
              autoFocus
              name="q"
              type="search"
              placeholder="Search tees, hoodies, cargos…"
              className="h-10 flex-1 bg-transparent text-lg outline-none"
              aria-label="Search products"
              maxLength={80}
            />
            <button type="button" onClick={() => setOpen(false)} className="p-2" aria-label="Close search">
              <CloseIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  return (
    <>
      <button className="-ms-2 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <MenuIcon />
      </button>
      {open && (
        <div className="animate-fade-in bg-bg fixed inset-0 z-50 flex flex-col lg:hidden">
          <div className="flex h-[var(--brand-header-h)] items-center justify-between px-4">
            <span className="eyebrow">Menu</span>
            <button onClick={() => setOpen(false)} className="p-2" aria-label="Close menu">
              <CloseIcon />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-4 pt-6">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="display py-1 text-5xl">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="text-muted mt-auto flex gap-6 px-4 py-8 text-sm">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/shipping">Shipping</Link>
          </div>
        </div>
      )}
    </>
  );
}
