import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/store/CatalogView";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getCollection = (slug: string) => db.collection.findUnique({ where: { slug } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCollection((await params).slug);
  if (!c) return {};
  return {
    title: c.name,
    description: c.description || `Shop the ${c.name} collection.`,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: c.imageUrl ? { images: [{ url: c.imageUrl }] } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const c = await getCollection((await params).slug);
  if (!c) notFound();
  return (
    <CatalogView
      title={c.name}
      eyebrow="Collection"
      description={c.description}
      basePath={`/collections/${c.slug}`}
      collectionSlug={c.slug}
      searchParams={await searchParams}
      showCategoryFilter
    />
  );
}
