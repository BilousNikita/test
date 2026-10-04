import { CartDrawer } from "@/components/store/CartDrawer";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { StoreProvider } from "@/components/store/StoreProvider";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <StoreProvider
      config={{
        storeName: s.storeName,
        currency: s.currency,
        locale: s.locale,
        pricesIncludeTax: s.pricesIncludeTax,
      }}
    >
      <a
        href="#main"
        className="focus:bg-ink focus:text-bg sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3"
      >
        Skip to content
      </a>
      <Header settings={s} />
      <main id="main">{children}</main>
      <Footer settings={s} />
      <CartDrawer />
    </StoreProvider>
  );
}
