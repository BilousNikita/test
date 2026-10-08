import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/store/JsonLd";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductView } from "@/components/store/ProductView";
import type { SizeGuideType } from "@/components/store/SizeGuide";
import { getProductBySlug, getRelatedProducts, sortSizes } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/env";
import { getMoney } from "@/lib/format";
import { toMajor } from "@/lib/money";
import { getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Product not found" };
  const description = p.description.slice(0, 160);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.name,
      description,
      images: p.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt || p.name })),
    },
  };
}

function sizeGuideFor(category?: string | null): SizeGuideType {
  const c = (category ?? "").toLowerCase();
  if (/pant|short|trouser|jean/.test(c)) return "bottoms";
  if (/access|bag|cap|hat/.test(c)) return "none";
  return "tops";
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [settings, money, related] = await Promise.all([
    getSettings(),
    getMoney(),
    getRelatedProducts(product.id, product.categoryId),
  ]);

  const inStock = product.variants.some((v) => v.stock > 0);
  const url = absoluteUrl(`/product/${product.slug}`);
  const details = product.details
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean);
  const taxPct = `${(settings.taxRateBps / 100).toString()}%`;

  return (
    <div className="container-x pt-6 sm:pt-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          sku: product.supplierSku || product.id,
          image: product.images.map((i) => absoluteUrl(i.url)),
          brand: { "@type": "Brand", name: settings.storeName },
          category: product.category?.name,
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: settings.currency,
            price: toMajor(product.retailPrice, settings.currency),
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            ...(product.category
              ? [
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: product.category.name,
                    item: absoluteUrl(`/category/${product.category.slug}`),
                  },
                ]
              : []),
            { "@type": "ListItem", position: product.category ? 3 : 2, name: product.name, item: url },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-muted mb-6 text-xs">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/category/${product.category.slug}`} className="hover:text-ink">
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductView
        data={{
          name: product.name,
          price: money(product.retailPrice),
          compareAtPrice:
            product.compareAtPrice && product.compareAtPrice > product.retailPrice
              ? money(product.compareAtPrice)
              : null,
          categoryName: product.category?.name ?? null,
          images: product.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color })),
          variants: product.variants.map((v) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            stock: v.stock,
          })),
          sizes: sortSizes([...new Set(product.variants.map((v) => v.size))]),
          sizeGuide: sizeGuideFor(product.category?.slug),
          taxNote: settings.pricesIncludeTax
            ? `Incl. ${taxPct} tax. Shipping calculated at checkout.`
            : "Taxes and shipping calculated at checkout.",
        }}
      >
        <Accordion title="Description" open>
          <p>{product.description}</p>
          {details.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 ps-5">
              {details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </Accordion>
        <Accordion title="Shipping">
          <p>
            Every piece is made or packed for you by our production partners. Orders are dispatched within 1–3
            business days and delivered in 6–12 business days with standard shipping (3–6 with express).
            You&apos;ll receive a tracking link by email as soon as your order ships.
          </p>
          <Link href="/shipping" className="mt-2 inline-block underline underline-offset-4">
            Shipping & delivery
          </Link>
        </Accordion>
        <Accordion title="Returns">
          <p>
            Unworn items with tags can be returned within 30 days of delivery. Start a return by contacting us
            with your order number.
          </p>
          <Link href="/returns" className="mt-2 inline-block underline underline-offset-4">
            Returns & refunds
          </Link>
        </Accordion>
      </ProductView>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="display mb-8 text-4xl sm:text-6xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} money={money} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Accordion({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group py-4" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-[0.14em] uppercase">
        {title}
        <span className="text-lg transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="text-ink/80 pt-4 text-sm leading-6">{children}</div>
    </details>
  );
}
