import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Card, PageHeader } from "@/components/admin/ui";
import { importCsvAction, recalculatePricesAction } from "@/lib/admin/product-actions";
import { CSV_COLUMNS } from "@/lib/suppliers/csv";
import { getSupplierAdapter } from "@/lib/suppliers";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Import / Export" };

export default async function ImportExportPage() {
  const s = await getSettings();
  const adapter = getSupplierAdapter();
  return (
    <>
      <PageHeader title="Import / Export" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Import products (CSV)">
          <p className="text-muted mb-4 text-sm">
            One row per variant. Rows with the same <code>handle</code> become one product. Existing products
            (same handle) and variants (same
            <code> variant_sku</code>) are updated. Prices in {s.currency} major units (e.g. 12.50). Leave{" "}
            <code>retail_price</code> empty to use the markup rule (× {s.markup}). Image URLs are downloaded
            to your server.
          </p>
          <ActionForm action={importCsvAction} className="space-y-3">
            <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
            <SubmitButton pendingText="Importing…">Import CSV</SubmitButton>
          </ActionForm>
          <details className="mt-6 text-xs">
            <summary className="cursor-pointer font-semibold">CSV columns</summary>
            <p className="text-muted mt-2 break-words">{CSV_COLUMNS.join(", ")}</p>
          </details>
        </Card>
        <div className="space-y-6">
          <Card title="Export">
            <p className="text-muted mb-4 text-sm">
              Download every product and variant in the same CSV format (edit in a spreadsheet and re-import).
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/api/admin/products/export" className="btn-primary h-10">
                Export products CSV
              </a>
              <a href="/api/admin/products/export?template=1" className="btn-outline h-10">
                Download empty template
              </a>
            </div>
          </Card>
          <Card title="Price rules">
            <p className="text-muted mb-4 text-sm">
              Retail price = supplier cost × {s.markup} (rounded up to a whole unit), except for products with
              a manual price. Change the markup in Settings.
            </p>
            <ActionForm action={recalculatePricesAction}>
              <SubmitButton className="btn-outline h-10" pendingText="Recalculating…">
                Recalculate all prices now
              </SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Supplier connection">
            <p className="text-sm">
              Active adapter: <strong>{adapter.label}</strong>
            </p>
            <p className="text-muted mt-2 text-sm">
              {adapter.id === "csv"
                ? "Products come from CSV files and supplier orders are forwarded manually. To connect CJ Dropshipping or Spocket, see README → “Connecting a real supplier”."
                : adapter.autoPlaceEnabled()
                  ? "Paid orders are forwarded to the supplier automatically."
                  : "API adapter selected. Orders are forwarded manually until SUPPLIER_AUTO_PLACE=true and the adapter is implemented."}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
