import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "@/lib/admin/auth-actions";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isStripeTestMode } from "@/lib/payments/stripe";
import { env } from "@/lib/env";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const s = await getSettings();
  const e = env();
  const payMode =
    e.PAYMENT_PROVIDER === "mock"
      ? "MOCK PAYMENTS"
      : !e.STRIPE_SECRET_KEY
        ? "PAYMENTS NOT CONFIGURED"
        : isStripeTestMode()
          ? "STRIPE TEST MODE"
          : null;
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[220px_1fr]">
      <aside className="border-line bg-surface relative flex items-center justify-between border-b px-4 py-3 lg:block lg:border-e lg:border-b-0 lg:px-3 lg:py-6">
        <div className="lg:mb-8 lg:px-3">
          <Link href="/admin" className="display text-xl">
            {s.storeName}
          </Link>
          <p className="text-muted hidden text-[11px] lg:block">Admin · {admin.email}</p>
        </div>
        <AdminNav />
        <div className="hidden space-y-1 px-3 pt-8 text-sm lg:block">
          <Link href="/" target="_blank" className="text-muted hover:text-ink block">
            View store ↗
          </Link>
          <form action={logoutAction}>
            <button className="text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        {payMode && (
          <div className="bg-accent text-accent-ink px-4 py-1.5 text-center text-[11px] font-semibold tracking-widest uppercase">
            {payMode}
          </div>
        )}
        <div className="p-4 sm:p-8">{children}</div>
        <form action={logoutAction} className="px-4 pb-8 lg:hidden">
          <button className="text-muted text-sm underline">Sign out</button>
        </form>
      </div>
    </div>
  );
}
