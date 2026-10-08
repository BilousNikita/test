import type { Metadata } from "next";
import { CatalogView } from "@/components/store/CatalogView";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Shop the full collection: heavyweight tees, hoodies, pants, shorts and accessories.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <CatalogView
      title="Shop all"
      eyebrow="All products"
      basePath="/shop"
      searchParams={await searchParams}
      showCategoryFilter
    />
  );
}
