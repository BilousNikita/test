import Image from "next/image";
import { ActionForm } from "@/components/admin/ActionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Card, Field, PageHeader } from "@/components/admin/ui";
import { changePasswordAction } from "@/lib/admin/auth-actions";
import {
  deleteShippingMethodAction,
  saveSettingsAction,
  saveShippingMethodAction,
} from "@/lib/admin/settings-actions";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { toMajor } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const methods = await db.shippingMethod.findMany({ orderBy: { position: "asc" } });
  const maj = (v: number) => toMajor(v, s.currency);
  const e = env();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Store">
          <ActionForm action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Store name">
                <input name="storeName" defaultValue={s.storeName} className="input" required />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Logo"
                hint="Optional. Without a logo the store name is shown in the display font."
              >
                <div className="flex items-center gap-4">
                  {s.logoUrl && (
                    <Image
                      src={s.logoUrl}
                      alt="Logo"
                      width={120}
                      height={40}
                      className="bg-subtle h-10 w-auto"
                    />
                  )}
                  <input type="file" name="logo" accept="image/*" className="text-sm" />
                  {s.logoUrl && (
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" name="removeLogo" /> Remove
                    </label>
                  )}
                </div>
              </Field>
            </div>
            <Field label="Currency (ISO)" hint="Only changes the label – prices are not converted">
              <input name="currency" defaultValue={s.currency} maxLength={3} className="input uppercase" />
            </Field>
            <Field label="Contact email">
              <input name="contactEmail" type="email" defaultValue={s.contactEmail} className="input" />
            </Field>
            <Field label="Tax / VAT rate (%)">
              <input name="taxRate" inputMode="decimal" defaultValue={s.taxRateBps / 100} className="input" />
            </Field>
            <Field label="Price markup (× supplier cost)">
              <input name="markup" inputMode="decimal" defaultValue={s.markup} className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="pricesIncludeTax" defaultChecked={s.pricesIncludeTax} /> Prices
              include tax (VAT-style). Untick to add tax on top at checkout.
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="applyMarkup" defaultChecked /> When the markup changes, recalculate
              prices of all products without a manual price
            </label>
            <div className="sm:col-span-2">
              <Field label="Announcement bar" hint="Leave empty to hide">
                <input name="announcement" defaultValue={s.announcement} className="input" maxLength={160} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Save settings</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card title="Shipping rates">
            <div className="space-y-4">
              {methods.map((m) => (
                <div key={m.id} className="border-line border-b pb-4">
                  <ShippingForm
                    m={{ ...m, price: maj(m.price), freeOver: m.freeOver != null ? maj(m.freeOver) : "" }}
                    currency={s.currency}
                  />
                  <form action={deleteShippingMethodAction} className="mt-1 text-end">
                    <input type="hidden" name="id" value={m.id} />
                    <SubmitButton
                      className="text-danger text-xs underline"
                      pendingText="…"
                      confirm="Delete this shipping method?"
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              ))}
              <p className="text-xs font-semibold tracking-wide uppercase">Add method</p>
              <ShippingForm
                m={{
                  name: "",
                  description: "",
                  price: "",
                  freeOver: "",
                  minDays: 3,
                  maxDays: 7,
                  position: methods.length,
                  active: true,
                }}
                currency={s.currency}
              />
            </div>
          </Card>

          <Card title="Change admin password">
            <ActionForm action={changePasswordAction} className="grid gap-3">
              <input
                name="current"
                type="password"
                placeholder="Current password"
                autoComplete="current-password"
                className="input h-10"
                required
              />
              <input
                name="next"
                type="password"
                placeholder="New password (12+ characters)"
                autoComplete="new-password"
                className="input h-10"
                required
              />
              <input
                name="confirm"
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="input h-10"
                required
              />
              <SubmitButton className="btn-outline h-10">Update password</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Environment (read-only)">
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted">SITE_URL</dt>
              <dd className="break-all">{e.SITE_URL}</dd>
              <dt className="text-muted">Payments</dt>
              <dd>
                {e.PAYMENT_PROVIDER}
                {e.PAYMENT_PROVIDER === "stripe" &&
                  (e.STRIPE_SECRET_KEY
                    ? e.STRIPE_SECRET_KEY.startsWith("sk_live_")
                      ? " (LIVE)"
                      : " (test)"
                    : " (no key!)")}
              </dd>
              <dt className="text-muted">Stripe webhook</dt>
              <dd>{e.STRIPE_WEBHOOK_SECRET ? "configured" : "not configured"}</dd>
              <dt className="text-muted">Email</dt>
              <dd>
                {e.MAIL_TRANSPORT === "smtp" && e.SMTP_HOST ? `SMTP (${e.SMTP_HOST})` : "console log only"}
              </dd>
              <dt className="text-muted">Supplier adapter</dt>
              <dd>
                {e.SUPPLIER_ADAPTER}
                {e.SUPPLIER_AUTO_PLACE ? " (auto-place on)" : ""}
              </dd>
              <dt className="text-muted">Storage</dt>
              <dd>{e.STORAGE_DRIVER}</dd>
            </dl>
            <p className="text-muted mt-3 text-xs">
              These are set in the server&apos;s .env file – see README.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function ShippingForm({
  m,
  currency,
}: {
  m: {
    id?: string;
    name: string;
    description: string;
    price: string;
    freeOver: string;
    minDays: number;
    maxDays: number;
    position: number;
    active: boolean;
  };
  currency: string;
}) {
  return (
    <ActionForm action={saveShippingMethodAction} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {m.id && <input type="hidden" name="id" value={m.id} />}
      <input name="name" defaultValue={m.name} placeholder="Name" className="input h-9 text-sm" required />
      <input
        name="description"
        defaultValue={m.description}
        placeholder="Description"
        className="input h-9 text-sm sm:col-span-3"
      />
      <label className="text-muted text-xs">
        Price ({currency})
        <input name="price" defaultValue={m.price} inputMode="decimal" className="input h-9 text-sm" />
      </label>
      <label className="text-muted text-xs">
        Free over ({currency})
        <input
          name="freeOver"
          defaultValue={m.freeOver}
          inputMode="decimal"
          placeholder="—"
          className="input h-9 text-sm"
        />
      </label>
      <label className="text-muted text-xs">
        Min days
        <input name="minDays" type="number" defaultValue={m.minDays} className="input h-9 text-sm" />
      </label>
      <label className="text-muted text-xs">
        Max days
        <input name="maxDays" type="number" defaultValue={m.maxDays} className="input h-9 text-sm" />
      </label>
      <input type="hidden" name="position" value={m.position} />
      <label className="col-span-1 flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={m.active} /> Active
      </label>
      <div className="col-span-1 text-end sm:col-span-3">
        <SubmitButton className="btn-primary h-9 px-4 text-[11px]">{m.id ? "Save" : "Add"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
