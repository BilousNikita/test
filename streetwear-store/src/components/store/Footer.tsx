import Link from "next/link";
import type { StoreSettings } from "@/lib/settings";
import { getNavCategories } from "@/lib/catalog";
import { NewsletterForm } from "./NewsletterForm";

export async function Footer({ settings }: { settings: StoreSettings }) {
  const categories = await getNavCategories();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-bg mt-24">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="space-y-6">
          <p className="display text-5xl sm:text-6xl">{settings.storeName}</p>
          <p className="text-bg/60 max-w-sm text-sm">
            New drops, restocks and studio notes. No spam — unsubscribe anytime.
          </p>
          <NewsletterForm dark />
        </div>
        <FooterCol
          title="Shop"
          links={[
            { href: "/shop", label: "All products" },
            ...categories.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
          ]}
        />
        <FooterCol
          title="Help"
          links={[
            { href: "/shipping", label: "Shipping & Delivery" },
            { href: "/returns", label: "Returns & Refunds" },
            { href: "/contact", label: "Contact" },
          ]}
        />
        <FooterCol
          title="Studio"
          links={[
            { href: "/about", label: "About" },
            { href: "/privacy", label: "Privacy Policy" },
            { href: "/terms", label: "Terms of Service" },
          ]}
        />
      </div>
      <div className="container-x border-bg/15 text-bg/50 flex flex-col gap-2 border-t py-6 text-xs sm:flex-row sm:justify-between">
        <p>
          © {year} {settings.storeName}. All rights reserved.
        </p>
        <p>{settings.contactEmail}</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-bg/50 mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase">{title}</p>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="link-underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
