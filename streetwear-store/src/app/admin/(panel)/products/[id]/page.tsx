import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PageHeader } from "@/components/admin/ui";
import { deleteProductAction } from "@/lib/admin/product-actions";
import { getProductFormData, getProductFormOptions } from "@/lib/admin/product-form-data";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const s = await getSettings();
  const [data, opts] = await Promise.all([getProductFormData(id, s.currency), getProductFormOptions()]);
  if (!data) notFound();
  const { saved } = await searchParams;
  return (
    <>
      <PageHeader title={data.name}>
        <Link href={`/product/${data.slug}`} target="_blank" className="btn-outline h-10">
          View ↗
        </Link>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={data.id} />
          <SubmitButton
            className="btn border-danger text-danger h-10 border"
            pendingText="Deleting…"
            confirm="Delete this product permanently?"
          >
            Delete
          </SubmitButton>
        </form>
      </PageHeader>
      {saved && (
        <p className="border-success/30 bg-success/10 text-success mb-4 border p-3 text-sm">
          {saved.slice(0, 200)}
        </p>
      )}
      <ProductForm
        key={JSON.stringify(data)}
        initial={data}
        {...opts}
        markup={s.markup}
        currency={s.currency}
      />
    </>
  );
}
