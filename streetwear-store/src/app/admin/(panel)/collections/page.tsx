import Image from "next/image";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Card, PageHeader } from "@/components/admin/ui";
import { deleteCollectionAction, saveCollectionAction } from "@/lib/admin/taxonomy-actions";
import { db } from "@/lib/db";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const collections = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return (
    <>
      <PageHeader title="Collections" />
      <p className="text-muted mb-6 max-w-2xl text-sm">
        Featured collections (up to 3) appear on the home page. Assign products to collections on the product
        edit page.
      </p>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {collections.map((c) => (
            <Card key={c.id}>
              <div className="flex gap-4">
                <div className="bg-subtle relative hidden h-28 w-24 shrink-0 sm:block">
                  {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <ActionForm
                  action={saveCollectionAction}
                  className="grid flex-1 gap-3 sm:grid-cols-[1fr_1fr_80px]"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <label className="label">Name</label>
                    <input name="name" defaultValue={c.name} className="input h-10" />
                  </div>
                  <div>
                    <label className="label">Slug</label>
                    <input name="slug" defaultValue={c.slug} className="input h-10" />
                  </div>
                  <div>
                    <label className="label">Order</label>
                    <input name="position" type="number" defaultValue={c.position} className="input h-10" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label">Description</label>
                    <input name="description" defaultValue={c.description} className="input h-10" />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="featured" defaultChecked={c.featured} /> Featured on home
                    </label>
                    <label className="text-sm">
                      Cover image <input type="file" name="image" accept="image/*" className="text-xs" />
                    </label>
                    <SubmitButton className="btn-primary ms-auto h-10">Save</SubmitButton>
                  </div>
                </ActionForm>
              </div>
              <form
                action={deleteCollectionAction}
                className="text-muted mt-2 flex items-center justify-between text-xs"
              >
                <span>
                  {c._count.products} products{c.isPlaceholder && " · placeholder"}
                </span>
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton className="text-danger underline" pendingText="…" confirm="Delete collection?">
                  Delete
                </SubmitButton>
              </form>
            </Card>
          ))}
        </div>
        <Card title="New collection" className="h-fit">
          <ActionForm action={saveCollectionAction} className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input name="name" required className="input h-10" />
            </div>
            <div>
              <label className="label">Slug (optional)</label>
              <input name="slug" className="input h-10" />
            </div>
            <div>
              <label className="label">Description</label>
              <input name="description" className="input h-10" />
            </div>
            <div>
              <label className="label">Cover image</label>
              <input type="file" name="image" accept="image/*" className="text-xs" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" defaultChecked /> Featured on home
            </label>
            <input type="hidden" name="position" value={collections.length} />
            <SubmitButton className="btn-primary w-full">Create</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
