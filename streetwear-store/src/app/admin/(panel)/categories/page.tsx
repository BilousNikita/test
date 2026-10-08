import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Card, PageHeader } from "@/components/admin/ui";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/admin/taxonomy-actions";
import { db } from "@/lib/db";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return (
    <>
      <PageHeader title="Categories" />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {categories.map((c) => (
            <Card key={c.id}>
              <ActionForm
                action={saveCategoryAction}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_80px_auto] sm:items-end"
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
                <SubmitButton className="btn-primary h-10">Save</SubmitButton>
                <div className="sm:col-span-4">
                  <label className="label">Description</label>
                  <input name="description" defaultValue={c.description} className="input h-10" />
                </div>
              </ActionForm>
              <form
                action={deleteCategoryAction}
                className="text-muted mt-2 flex items-center justify-between text-xs"
              >
                <span>
                  {c._count.products} products{c.isPlaceholder && " · placeholder"}
                </span>
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton
                  className="text-danger underline"
                  pendingText="…"
                  confirm="Delete category? Products stay but lose this category."
                >
                  Delete
                </SubmitButton>
              </form>
            </Card>
          ))}
        </div>
        <Card title="New category" className="h-fit">
          <ActionForm action={saveCategoryAction} className="space-y-3">
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
            <input type="hidden" name="position" value={categories.length} />
            <SubmitButton className="btn-primary w-full">Create</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
