import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMailSafe } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { contactSchema, fieldErrors } from "@/lib/validation";

export async function POST(req: Request) {
  if (!rateLimit(`contact:${clientIp(req.headers)}`, 3, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many messages – please try again later." }, { status: 429 });
  }
  const parsed = contactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const msg = await db.contactMessage.create({ data: parsed.data });
  const s = await getSettings();
  await sendMailSafe({
    to: s.contactEmail,
    replyTo: parsed.data.email,
    subject: `[${s.storeName}] Contact form: ${parsed.data.name}`,
    text: `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}\n\n(id ${msg.id})`,
    html: `<p>From: ${escapeHtml(parsed.data.name)} &lt;${escapeHtml(parsed.data.email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(parsed.data.message)}</p>`,
  });
  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
