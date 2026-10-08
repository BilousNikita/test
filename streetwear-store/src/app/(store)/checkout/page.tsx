import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/CheckoutForm";
import { COUNTRIES } from "@/lib/countries";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const sp = await searchParams;
  const methods = await db.shippingMethod.findMany({ where: { active: true }, orderBy: { position: "asc" } });
  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="display text-5xl sm:text-7xl">Checkout</h1>
      {sp.canceled && (
        <p className="border-line bg-surface mt-6 border p-4 text-sm">
          Payment was cancelled — your bag is still here whenever you&apos;re ready.
        </p>
      )}
      <CheckoutForm
        countries={COUNTRIES}
        methods={methods.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          price: m.price,
          freeOver: m.freeOver,
        }))}
      />
    </div>
  );
}
