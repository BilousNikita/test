import type { Order, OrderItem } from "@prisma/client";
import { formatMoney } from "../money";
import { absoluteUrl } from "../env";
import type { StoreSettings } from "../settings";
import type { MailMessage } from "./index";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(settings: StoreSettings, title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;color:#111">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;padding:32px">
<tr><td style="font-size:22px;letter-spacing:4px;font-weight:700;padding-bottom:24px">${esc(settings.storeName)}</td></tr>
<tr><td style="font-size:18px;font-weight:700;padding-bottom:16px">${esc(title)}</td></tr>
<tr><td style="font-size:14px;line-height:1.6">${body}</td></tr>
<tr><td style="font-size:12px;color:#777;padding-top:32px">Questions? Reply to this email or write to ${esc(settings.contactEmail)}.</td></tr>
</table></td></tr></table></body></html>`;
}

export function orderConfirmationEmail(
  order: Order & { items: OrderItem[] },
  settings: StoreSettings,
): MailMessage {
  const m = (v: number) => formatMoney(v, order.currency, settings.locale);
  const url = absoluteUrl(`/order/${order.id}?token=${order.accessToken}`);
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.productName)} <span style="color:#777">(${esc(i.variantLabel)}) × ${i.quantity}</span></td><td align="right">${m(i.lineTotal)}</td></tr>`,
    )
    .join("");
  const taxLabel = order.pricesIncludeTax ? "Incl. tax" : "Tax";
  const html = layout(
    settings,
    `Thank you — order ${order.orderNumber} is confirmed`,
    `<p>Hi ${esc(order.shipName)}, we've received your payment and are preparing your order. You'll get another email with tracking as soon as it ships.</p>
<table width="100%" style="font-size:14px;border-top:1px solid #eee;margin-top:16px">${rows}
<tr><td style="padding-top:12px">Subtotal</td><td align="right" style="padding-top:12px">${m(order.subtotal)}</td></tr>
<tr><td>Shipping (${esc(order.shippingMethodName)})</td><td align="right">${m(order.shippingCost)}</td></tr>
<tr><td>${taxLabel}</td><td align="right">${m(order.taxAmount)}</td></tr>
<tr><td style="font-weight:700;padding-top:8px">Total</td><td align="right" style="font-weight:700;padding-top:8px">${m(order.total)}</td></tr></table>
<p style="margin-top:16px"><b>Shipping to</b><br>${esc(order.shipName)}<br>${esc(order.shipLine1)}${order.shipLine2 ? `<br>${esc(order.shipLine2)}` : ""}<br>${esc(order.shipPostalCode)} ${esc(order.shipCity)}<br>${esc(order.shipCountry)}</p>
<p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none">View your order</a></p>`,
  );
  const text = [
    `Order ${order.orderNumber} confirmed.`,
    ...order.items.map((i) => `- ${i.productName} (${i.variantLabel}) x${i.quantity}: ${m(i.lineTotal)}`),
    `Subtotal: ${m(order.subtotal)}`,
    `Shipping: ${m(order.shippingCost)}`,
    `${taxLabel}: ${m(order.taxAmount)}`,
    `Total: ${m(order.total)}`,
    `View your order: ${url}`,
  ].join("\n");
  return {
    to: order.email,
    subject: `Order ${order.orderNumber} confirmed — ${settings.storeName}`,
    html,
    text,
  };
}

export function shippingUpdateEmail(order: Order, settings: StoreSettings): MailMessage {
  const url = absoluteUrl(`/order/${order.id}?token=${order.accessToken}`);
  const tracking = order.trackingNumber ?? "";
  const carrier = order.trackingCarrier ? ` (${order.trackingCarrier})` : "";
  const trackLink = order.trackingUrl
    ? `<p><a href="${esc(order.trackingUrl)}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none">Track your parcel</a></p>`
    : "";
  const html = layout(
    settings,
    `Your order ${order.orderNumber} is on its way`,
    `<p>Good news — your order has shipped.</p><p><b>Tracking number:</b> ${esc(tracking)}${esc(carrier)}</p>${trackLink}<p><a href="${url}">View order</a></p>`,
  );
  const text = `Your order ${order.orderNumber} has shipped.\nTracking: ${tracking}${carrier}\n${order.trackingUrl ?? ""}\nOrder: ${url}`;
  return { to: order.email, subject: `Your order ${order.orderNumber} has shipped`, html, text };
}
