import Image from "next/image";
import Link from "next/link";
import type { CardProduct } from "@/lib/catalog";

export function ProductCard({
  product,
  money,
  priority = false,
}: {
  product: CardProduct;
  money: (m: number) => string;
  priority?: boolean;
}) {
  const [first, second] = product.images;
  const colors = [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()];
  const soldOut = product.variants.length > 0 && product.variants.every((v) => v.stock <= 0);
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.retailPrice;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="bg-subtle relative aspect-[4/5] overflow-hidden">
        {first && (
          <Image
            src={first.url}
            alt={first.alt || product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="ease-brand object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
        {second && (
          <Image
            src={second.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        <div className="absolute start-3 top-3 flex gap-1.5">
          {soldOut && (
            <span className="bg-ink text-bg px-2 py-1 text-[10px] font-semibold tracking-widest uppercase">
              Sold out
            </span>
          )}
          {onSale && !soldOut && (
            <span className="bg-accent text-accent-ink px-2 py-1 text-[10px] font-semibold tracking-widest uppercase">
              Sale
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium">{product.name}</h3>
          <div className="mt-1.5 flex gap-1" aria-label={`${colors.length} colours`}>
            {colors.slice(0, 5).map(([name, hex]) => (
              <span
                key={name}
                title={name}
                className="h-2.5 w-2.5 rounded-full border border-black/15"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
        <p className="text-[13px] whitespace-nowrap">
          {onSale && <span className="text-muted me-1.5 line-through">{money(product.compareAtPrice!)}</span>}
          {money(product.retailPrice)}
        </p>
      </div>
    </Link>
  );
}
