import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { finalizePaidOrder } from "@/lib/orders";
import { mockPaymentsAllowed } from "@/lib/payments";
import { safeEqual } from "@/lib/tokens";

const schema = z.object({
  order: z.string().min(1).max(64),
  token: z.string().min(1).max(100),
  action: z.enum(["pay", "cancel"]),
});

const redirect = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });

export async function POST(req: Request) {
  if (!mockPaymentsAllowed()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(Object.fromEntries(await req.formData()));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { order: id, token, action } = parsed.data;
  const order = await db.order.findUnique({ where: { id } });
  if (!order || !safeEqual(order.accessToken, token) || order.paymentProvider !== "mock") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (action === "cancel") return redirect("/checkout?canceled=1");
  await finalizePaidOrder(order.id, { paymentIntentRef: `mock_pi_${order.id}` });
  return redirect(`/order/${order.id}?token=${encodeURIComponent(token)}`);
}
