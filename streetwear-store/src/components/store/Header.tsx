import Image from "next/image";
import Link from "next/link";
import { getNavCategories } from "@/lib/catalog";
import type { StoreSettings } from "@/lib/settings";
import { CartButton, MobileMenu, SearchButton } from "./HeaderClient";

export async function Header({ settings }: { settings: StoreSettings }) {
  const categories = await getNavCategories();
  const links = [
    { href: "/shop", label: "Shop all" },
    ...categories.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
  ];

  return (
    <>
      {settings.announcement && (
        <div className="bg-ink text-bg py-2 text-center text-[11px] font-medium tracking-[0.18em] uppercase">
          {settings.announcement}
        </div>
      )}
      <header className="border-line bg-bg/90 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="container-x relative grid h-[var(--brand-header-h)] grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-6">
            <MobileMenu links={links} />
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="link-underline text-[12px] font-semibold tracking-[0.14em] uppercase"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center"
            aria-label={`${settings.storeName} home`}
          >
            {settings.logoUrl ? (
              <Image
                src={settings.logoUrl}
                alt={settings.storeName}
                width={160}
                height={40}
                className="h-8 w-auto"
                priority
              />
            ) : (
              <span className="display text-2xl tracking-[0.06em] sm:text-3xl">{settings.storeName}</span>
            )}
          </Link>
          <div className="flex items-center justify-end gap-1 sm:gap-3">
            <SearchButton />
            <CartButton />
          </div>
        </div>
      </header>
    </>
  );
}
