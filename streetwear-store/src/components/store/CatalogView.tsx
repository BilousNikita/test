import { Suspense } from "react";
import { getNavCategories, parseCatalogParams, searchProducts, SORTS } from "@/lib/catalog";
import { getMoney } from "@/lib/format";
import { toMajor, toMinor } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { CatalogFilters } from "./CatalogFilters";
import { Pagination } from "./Pagination";
import { ProductCard } from "./ProductCard";

type SP = Record<string, string | string[] | undefined>;

export async function CatalogView({
  title,
  eyebrow,
  description,
  basePath,
  searchParams,
  categorySlug,
  collectionSlug,
  showCategoryFilter = false,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  basePath: string;
  searchParams: SP;
  categorySlug?: string;
  collectionSlug?: string;
  showCategoryFilter?: boolean;
}) {
  const settings = await getSettings();
  const money = await getMoney();
  const q = parseCatalogParams(searchParams, (v) => toMinor(v, settings.currency));
  const [result, categories] = await Promise.all([
    searchProducts({ ...q, categorySlug: categorySlug ?? q.category, collectionSlug }),
    showCategoryFilter ? getNavCategories() : Promise.resolve(undefined),
  ]);

  const filterProps = {
    sizes: result.facets.sizes,
    colors: result.facets.colors,
    categories,
    total: result.total,
    sorts: Object.entries(SORTS).map(([key, s]) => ({ key, label: s.label })),
    priceBounds: {
      min: toMajor(result.facets.minPrice, settings.currency).replace(/\.0+$/, ""),
      max: toMajor(result.facets.maxPrice, settings.currency).replace(/\.0+$/, ""),
    },
  };

  return (
    <div className="container-x pt-10 sm:pt-14">
      <header className="mb-10 max-w-3xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display mt-2 text-6xl sm:text-8xl">{title}</h1>
        {description && <p className="text-muted mt-4 text-[15px]">{description}</p>}
      </header>
      <Suspense>
        <CatalogFilters mode="bar" {...filterProps} />
      </Suspense>
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <Suspense>
            <CatalogFilters mode="sidebar" {...filterProps} />
          </Suspense>
        </aside>
        <section aria-label="Products">
          {result.products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="display text-4xl">Nothing found</p>
              <p className="text-muted mt-3 text-sm">
                Try removing some filters or searching for something else.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
              {result.products.map((p, i) => (
                <ProductCard key={p.id} product={p} money={money} priority={i < 3} />
              ))}
            </div>
          )}
          <Pagination page={result.page} pages={result.pages} basePath={basePath} params={searchParams} />
        </section>
      </div>
    </div>
  );
}
