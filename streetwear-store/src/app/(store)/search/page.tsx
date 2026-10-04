import type { Metadata } from "next";
import { CatalogView } from "@/components/store/CatalogView";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) ?? "";
  return (
    <>
      <div className="container-x pt-10">
        <form action="/search" className="border-ink flex max-w-xl border-b">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search products"
            aria-label="Search products"
            maxLength={80}
            className="h-12 flex-1 bg-transparent text-lg outline-none"
          />
          <button className="text-xs font-semibold tracking-[0.18em] uppercase">Search</button>
        </form>
      </div>
      <CatalogView
        title={q ? `“${q}”` : "Search"}
        eyebrow="Search results"
        basePath="/search"
        searchParams={sp}
        showCategoryFilter
      />
    </>
  );
}
