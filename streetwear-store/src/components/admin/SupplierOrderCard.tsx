import type { SupplierOrder } from "@prisma/client";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";
import { Badge, Card } from "./ui";
import { updateSupplierOrderAction } from "@/lib/admin/order-actions";
import { SUPPLIER_ORDER_STATUSES } from "@/lib/validation";

interface Ship {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email: string;
}
interface Item {
  supplierSku: string;
  sku: string;
  name: string;
  variant: string;
  quantity: number;
  supplierUrl?: string;
}

/** Supplier order with a copy-ready text block to forward to the supplier. */
export function SupplierOrderCard({ so, orderNumber }: { so: SupplierOrder; orderNumber: string }) {
  const ship = JSON.parse(so.shippingSnapshot) as Ship;
  const items = JSON.parse(so.itemsSnapshot) as Item[];
  const address = [
    ship.name,
    ship.line1,
    ship.line2,
    `${ship.postalCode} ${ship.city}${ship.region ? `, ${ship.region}` : ""}`,
    ship.country,
    ship.phone ? `Phone: ${ship.phone}` : "",
  ].filter(Boolean);
  const forward = [
    `Order reference: ${orderNumber}`,
    "",
    ...items.map(
      (i) =>
        `${i.quantity} × ${i.name} (${i.variant}) — supplier SKU: ${i.supplierSku || "?"}${i.supplierUrl ? ` — ${i.supplierUrl}` : ""}`,
    ),
    "",
    "Ship to:",
    ...address,
  ].join("\n");

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">{so.supplierName}</p>
        <Badge status={so.status} />
      </div>
      <pre className="bg-bg mb-4 max-h-60 overflow-auto p-3 text-xs whitespace-pre-wrap select-all">
        {forward}
      </pre>
      <ActionForm action={updateSupplierOrderAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={so.id} />
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={so.status} className="input h-10">
            {SUPPLIER_ORDER_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Supplier order #</label>
          <input name="supplierOrderRef" defaultValue={so.supplierOrderRef ?? ""} className="input h-10" />
        </div>
        <div>
          <label className="label">Supplier tracking #</label>
          <input name="trackingNumber" defaultValue={so.trackingNumber ?? ""} className="input h-10" />
        </div>
        <div>
          <label className="label">Notes</label>
          <input name="notes" defaultValue={so.notes ?? ""} className="input h-10" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="copyTracking" /> Copy tracking # to the customer order and email the
          customer
        </label>
        <div className="sm:col-span-2">
          <SubmitButton className="btn-primary h-10">Update supplier order</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
