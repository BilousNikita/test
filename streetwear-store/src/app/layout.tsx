import type { Metadata, Viewport } from "next";
import "@fontsource/anton/400.css";
import "@fontsource-variable/inter/index.css";
import "./globals.css";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";

// Everything reads runtime config (SITE_URL, settings, DB) – never bake it in at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const description = `${s.storeName} — designer streetwear. Heavyweight tees, hoodies, pants and shorts.`;
  return {
    metadataBase: new URL(env().SITE_URL),
    title: { default: `${s.storeName} — Designer Streetwear`, template: `%s — ${s.storeName}` },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: s.storeName,
      title: s.storeName,
      description,
      images: [{ url: "/brand/og.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0e0e0e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang={s.locale.split("-")[0]} dir={s.direction}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
