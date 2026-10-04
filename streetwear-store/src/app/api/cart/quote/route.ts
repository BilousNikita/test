import { NextResponse } from "next/server";
import { quoteCart } from "@/lib/orders";
import { toPublicQuote } from "@/lib/public-quote";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cartQuoteSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const rl = rateLimit(`quote:${clientIp(req.headers)}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = cartQuoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });

  const quote = await quoteCart(parsed.data.items, parsed.data.shippingMethodId);
  return NextResponse.json(toPublicQuote(quote));
}
