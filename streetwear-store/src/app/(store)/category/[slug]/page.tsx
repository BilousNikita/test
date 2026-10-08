import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/store/CatalogView";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getCategory(slug: string) {
  return db.category.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return {};
  return {
    title: c.name,
    description: c.description || `Shop ${c.name}.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = await getCategory((await params).slug);
  if (!c) notFound();
  return (
    <CatalogView
      title={c.name}
      eyebrow="Category"
      description={c.description}
      basePath={`/category/${c.slug}`}
      categorySlug={c.slug}
      searchParams={await searchParams}
    />
  );
}
