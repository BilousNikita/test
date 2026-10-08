"use client";

import { useMemo, useState } from "react";
import { ProductGallery } from "./ProductGallery";
import { SizeGuide, type SizeGuideType } from "./SizeGuide";
import { useStore } from "./StoreProvider";

export interface ProductViewData {
  name: string;
  price: string;
  compareAtPrice: string | null;
  categoryName: string | null;
  images: { url: string; alt: string; color: string | null }[];
  variants: { id: string; size: string; color: string; colorHex: string; stock: number }[];
  sizes: string[];
  sizeGuide: SizeGuideType;
  taxNote: string;
}

const LOW_STOCK = 3;

export function ProductView({ data, children }: { data: ProductViewData; children: React.ReactNode }) {
  const { add } = useStore();
  const colors = useMemo(
    () =>
      [...new Map(data.variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({
        name,
        hex,
      })),
    [data.variants],
  );
  const firstInStockColor = colors.find((c) =>
    data.variants.some((v) => v.color === c.name && v.stock > 0),
  )?.name;
  const [color, setColor] = useState(firstInStockColor ?? colors[0]?.name ?? "");
  const oneSize = data.sizes.length === 1;
  const [size, setSize] = useState<string | null>(oneSize ? data.sizes[0]! : null);
  const [added, setAdded] = useState(false);

  const variant = data.variants.find((v) => v.color === color && v.size === size);
  const images = useMemo(() => {
    const forColor = data.images.filter((i) => i.color === color);
    return (forColor.length ? forColor : data.images).map(({ url, alt }) => ({ url, alt }));
  }, [data.images, color]);

  const stockFor = (s: string) => data.variants.find((v) => v.color === color && v.size === s)?.stock ?? 0;
  const soldOutAll = data.variants.every((v) => v.stock <= 0);

  let status: { text: string; tone: "ok" | "low" | "out" } | null = null;
  if (variant) {
    if (variant.stock <= 0) status = { text: "Sold out in this size", tone: "out" };
    else if (variant.stock <= LOW_STOCK) status = { text: `Only ${variant.stock} left`, tone: "low" };
    else status = { text: "In stock — ships in 1–3 business days", tone: "ok" };
  }

  function onAdd() {
    if (!variant || variant.stock <= 0) return;
    add(variant.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
      <ProductGallery images={images} name={data.name} />
      <div className="lg:sticky lg:top-[calc(var(--brand-header-h)+24px)] lg:self-start">
        {data.categoryName && <p className="eyebrow">{data.categoryName}</p>}
        <h1 className="display mt-2 text-5xl sm:text-6xl">{data.name}</h1>
        <p className="mt-4 text-lg">
          {data.compareAtPrice && <span className="text-muted me-2 line-through">{data.compareAtPrice}</span>}
          {data.price}
        </p>
        <p className="text-muted mt-1 text-xs">{data.taxNote}</p>

        {colors.length > 0 && (
          <fieldset className="mt-8">
            <legend className="mb-3 text-xs">
              <span className="font-semibold tracking-wide uppercase">Colour</span>{" "}
              <span className="text-muted">— {color}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  aria-pressed={c.name === color}
                  aria-label={c.name}
                  title={c.name}
                  className={`h-9 w-9 rounded-full border p-0.5 transition ${c.name === color ? "border-ink" : "hover:border-line border-transparent"}`}
                >
                  <span
                    className="block h-full w-full rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-xs font-semibold tracking-wide uppercase">Size</legend>
            <SizeGuide type={data.sizeGuide} />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {data.sizes.map((s) => {
              const st = stockFor(s);
              const selected = s === size;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={selected}
                  aria-label={`${s}${st <= 0 ? " (sold out)" : ""}`}
                  className={`relative h-11 border text-xs font-medium transition ${
                    selected ? "border-ink bg-ink text-bg" : "border-line hover:border-ink"
                  } ${st <= 0 ? "text-muted line-through" : ""} ${oneSize ? "col-span-2" : ""}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4 h-5 text-xs" aria-live="polite">
          {status && (
            <span
              className={
                status.tone === "out" ? "text-danger" : status.tone === "low" ? "text-accent" : "text-success"
              }
            >
              ● {status.text}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={soldOutAll || !variant || variant.stock <= 0}
          className="btn-primary mt-4 w-full"
        >
          {soldOutAll
            ? "Sold out"
            : !size
              ? "Select a size"
              : variant && variant.stock <= 0
                ? "Sold out"
                : added
                  ? "Added to bag ✓"
                  : "Add to bag"}
        </button>

        <div className="divide-line border-line mt-10 divide-y border-y">{children}</div>
      </div>
    </div>
  );
}
