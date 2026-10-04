"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "@/components/ui/icons";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/supplier-orders", label: "Supplier orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/import-export", label: "Import / Export" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <>
      <button className="p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">
        <MenuIcon />
      </button>
      <nav
        className={`${open ? "block" : "hidden"} border-line bg-surface absolute inset-x-0 top-full z-30 border-b lg:static lg:block lg:border-0`}
      >
        <ul className="flex flex-col p-2 lg:p-0">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 text-sm ${active(l.href) ? "bg-ink text-bg" : "hover:bg-subtle"}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
