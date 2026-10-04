"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CloseIcon, FilterIcon } from "@/components/ui/icons";

interface Props {
  sizes: string[];
  colors: { name: string; hex: string }[];
  categories?: { name: string; slug: string }[];
  sorts: { key: string; label: string }[];
  total: number;
  priceBounds: { min: string; max: string };
  /** "bar" = sort bar + mobile drawer, "sidebar" = desktop filter column */
  mode: "bar" | "sidebar";
}

/**
 * Filter + sort UI. Everything is stored in the URL (?size=M&color=Black&min=20&max=80&sort=price-asc),
 * so filtered pages are shareable and work with the browser back button.
 */
export function CatalogFilters({ sizes, colors, categories, sorts, total, priceBounds, mode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = (key: string) => params.getAll(key).flatMap((v) => v.split(","));

  function update(mutator: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mutator(p);
    p.delete("page");
    startTransition(() => router.push(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  function toggle(key: string, value: string) {
    update((p) => {
      const cur = new Set(selected(key));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      p.delete(key);
      if (cur.size) p.set(key, [...cur].join(","));
    });
  }

  const activeCount = ["size", "color", "min", "max", "category"].reduce(
    (n, k) => n + selected(k).filter(Boolean).length,
    0,
  );

  const panel = (
    <div className="space-y-8">
      {categories && categories.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">Category</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = selected("category").includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => update((p) => (on ? p.delete("category") : p.set("category", c.slug)))}
                  aria-pressed={on}
                  className={`h-9 border px-3 text-xs font-medium ${on ? "border-ink bg-ink text-bg" : "border-line hover:border-ink"}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">Size</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const on = selected("size").includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle("size", s)}
                  aria-pressed={on}
                  className={`h-9 min-w-11 border px-3 text-xs font-medium ${on ? "border-ink bg-ink text-bg" : "border-line hover:border-ink"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {colors.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const on = selected("color").includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggle("color", c.name)}
                  aria-pressed={on}
                  className={`flex h-9 items-center gap-2 border px-3 text-xs ${on ? "border-ink" : "border-line hover:border-ink"}`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/15"
                    style={{ backgroundColor: c.hex }}
                  />
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="eyebrow mb-3">Price</legend>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            update((p) => {
              for (const k of ["min", "max"] as const) {
                const v = String(fd.get(k) ?? "").trim();
                if (v && Number(v) >= 0) p.set(k, v);
                else p.delete(k);
              }
            });
          }}
        >
          <input
            name="min"
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            placeholder={priceBounds.min}
            defaultValue={params.get("min") ?? ""}
            className="input h-9 w-24 text-sm"
            aria-label="Minimum price"
          />
          <span className="text-muted">–</span>
          <input
            name="max"
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            placeholder={priceBounds.max}
            defaultValue={params.get("max") ?? ""}
            className="input h-9 w-24 text-sm"
            aria-label="Maximum price"
          />
          <button className="border-ink h-9 border px-3 text-xs font-semibold uppercase">Go</button>
        </form>
      </fieldset>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() =>
            update((p) => ["size", "color", "min", "max", "category"].forEach((k) => p.delete(k)))
          }
          className="text-xs underline underline-offset-4"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  if (mode === "sidebar") return <div className={pending ? "opacity-60" : ""}>{panel}</div>;

  return (
    <>
      <div className="border-line mb-8 flex items-center justify-between gap-4 border-y py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase lg:hidden"
        >
          <FilterIcon width={16} height={16} /> Filter {activeCount > 0 && `(${activeCount})`}
        </button>
        <p className={`text-muted hidden text-xs lg:block ${pending ? "opacity-50" : ""}`}>
          {total} products
        </p>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted">Sort</span>
          <select
            value={params.get("sort") ?? "newest"}
            onChange={(e) =>
              update((p) => (e.target.value === "newest" ? p.delete("sort") : p.set("sort", e.target.value)))
            }
            className="border-line h-9 border bg-transparent px-2 text-xs font-medium"
          >
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="animate-fade-in bg-bg absolute inset-y-0 start-0 flex w-[88%] max-w-sm flex-col">
            <div className="border-line flex items-center justify-between border-b px-5 py-4">
              <span className="text-sm font-semibold tracking-[0.18em] uppercase">Filter</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close filters" className="p-2">
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{panel}</div>
            <div className="border-line border-t p-5">
              <button onClick={() => setMobileOpen(false)} className="btn-primary w-full">
                Show {total} products
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
