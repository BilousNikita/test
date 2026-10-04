import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/store/JsonLd";
import { NewsletterForm } from "@/components/store/NewsletterForm";
import { ProductCard } from "@/components/store/ProductCard";
import { Reveal } from "@/components/store/Reveal";
import { ArrowIcon } from "@/components/ui/icons";
import { getFeaturedCollections, getNewArrivals } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/env";
import { getMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [settings, money, collections, arrivals] = await Promise.all([
    getSettings(),
    getMoney(),
    getFeaturedCollections(),
    getNewArrivals(8),
  ]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: settings.storeName,
          url: absoluteUrl("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/search")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />

      {/* HERO */}
      <section className="bg-ink text-bg relative h-[86svh] min-h-[520px] overflow-hidden">
        <Image
          src="/brand/hero.webp"
          alt="Season campaign: heavyweight hoodie, boxy tee and cargo pants"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent rtl:bg-gradient-to-l" />
        <div className="container-x relative flex h-full flex-col justify-end pb-14 sm:pb-20">
          <p className="eyebrow animate-fade-up text-bg/70">Season 26 — Out now</p>
          <h1 className="display animate-fade-up mt-4 max-w-4xl text-[18vw] [animation-delay:120ms] sm:text-[12vw] lg:text-[9.5rem]">
            Built heavy.
            <br />
            Worn daily.
          </h1>
          <div className="animate-fade-up mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
            <Link href="/shop" className="btn-accent">
              Shop new arrivals <ArrowIcon width={16} height={16} />
            </Link>
            <Link href="#collections" className="btn border-bg/60 text-bg hover:bg-bg hover:text-ink border">
              Explore collections
            </Link>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      {collections.length > 0 && (
        <section id="collections" className="container-x scroll-mt-24 py-20 sm:py-28">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="display mt-2 text-5xl sm:text-7xl">Collections</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {collections.map((c, i) => (
              <Reveal key={c.id} delay={i * 100}>
                <Link
                  href={`/collections/${c.slug}`}
                  className="group bg-subtle relative block aspect-[4/5] overflow-hidden"
                >
                  {c.imageUrl && (
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="ease-brand object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="text-bg absolute inset-x-0 bottom-0 p-6">
                    <h3 className="display text-4xl">{c.name}</h3>
                    <p className="mt-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
                      {c._count.products} pieces <ArrowIcon width={14} height={14} />
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      <section className="container-x pb-20 sm:pb-28">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Just landed</p>
            <h2 className="display mt-2 text-5xl sm:text-7xl">New arrivals</h2>
          </div>
          <Link
            href="/shop"
            className="link-underline hidden text-xs font-semibold tracking-[0.16em] uppercase sm:block"
          >
            View all
          </Link>
        </div>
        {arrivals.length === 0 ? (
          <p className="text-muted">Products will appear here once you add them in the admin panel.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {arrivals.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <ProductCard product={p} money={money} priority={i < 2} />
              </Reveal>
            ))}
          </div>
        )}
        <Link href="/shop" className="btn-outline mt-12 w-full sm:hidden">
          View all
        </Link>
      </section>

      {/* BRAND STORY */}
      <section className="bg-surface">
        <div className="container-x grid items-center gap-10 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
          <Reveal className="bg-subtle relative aspect-[4/5] overflow-hidden">
            <Image
              src="/brand/story.webp"
              alt="Studio: zip hoodie and cap"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </Reveal>
          <Reveal delay={120}>
            <p className="eyebrow">The studio</p>
            <h2 className="display mt-3 text-5xl sm:text-7xl">Fewer pieces. Better made.</h2>
            <div className="text-ink/80 mt-8 max-w-lg space-y-4 text-[15px] leading-7">
              <p>
                {settings.storeName} started with one heavyweight tee and an obsession with how clothes should
                feel: dense fabrics, considered proportions and colours that work together.
              </p>
              <p>
                Every drop is small and intentional. We work with specialist makers and print partners, so
                each piece is produced when you order it — less waste, no endless overstock.
              </p>
            </div>
            <Link href="/about" className="btn-outline mt-10">
              Our story
            </Link>
          </Reveal>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="container-x py-20 text-center sm:py-28">
        <p className="eyebrow">Members get first access</p>
        <h2 className="display mx-auto mt-3 max-w-3xl text-5xl sm:text-7xl">Join the list</h2>
        <p className="text-muted mx-auto mt-4 max-w-md text-sm">
          Drops sell out. Get early access to new releases and restock alerts.
        </p>
        <div className="mt-8 flex justify-center">
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
