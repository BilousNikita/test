import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui";
import { emptyProduct, getProductFormOptions } from "@/lib/admin/product-form-data";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const [opts, s] = await Promise.all([getProductFormOptions(), getSettings()]);
  return (
    <>
      <PageHeader title="New product">
        <Link href="/admin/products" className="btn-outline h-10">
          Back
        </Link>
      </PageHeader>
      <ProductForm initial={emptyProduct} {...opts} markup={s.markup} currency={s.currency} />
    </>
  );
}
