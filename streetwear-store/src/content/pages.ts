/**
 * Static page content.
 * ⚠️  OWNER MUST REVIEW: these are TEMPLATE texts, not legal advice. Every passage marked
 * [REVIEW] must be checked/adapted for your business, country and suppliers (ideally by a lawyer).
 * When a page has been reviewed, set `reviewed: true` to hide the warning banner on the site.
 *
 * Placeholders: {{store}} = store name, {{email}} = contact email (from Settings).
 * Simple markup: lines starting with "## " are headings, "- " are bullet points.
 */
export interface StaticPage {
  title: string;
  description: string;
  reviewed: boolean;
  body: string;
}

export const PAGES: Record<string, StaticPage> = {
  about: {
    title: "About",
    description: "The story behind {{store}}.",
    reviewed: true,
    body: `{{store}} is an independent streetwear label built around a simple idea: fewer pieces, better made.

## The product
We design heavyweight essentials — tees, hoodies, trousers and shorts — with considered proportions, dense fabrics and a palette that works together. Every drop is small and intentional.

## How we make it
We work with specialist manufacturing and print partners around the world. Many pieces are produced or printed when you order them, which means less overstock and less waste.

## Get in touch
Questions, collaborations or press: {{email}}.`,
  },
  shipping: {
    title: "Shipping & Delivery",
    description: "Shipping methods, delivery times and costs.",
    reviewed: false,
    body: `## Processing time
Orders are processed within 1–3 business days. Because many items are made or packed to order by our production partners, items from one order may arrive in separate parcels. [REVIEW: confirm your suppliers' processing times]

## Delivery times
- Standard: 6–12 business days after dispatch [REVIEW]
- Express: 3–6 business days after dispatch [REVIEW]
Delivery times are estimates and may be longer during holidays or due to customs.

## Shipping costs
Shipping costs are shown at checkout before you pay. Free standard shipping applies above the threshold shown at checkout.

## Customs & duties
International orders may be subject to import duties and taxes charged by the destination country. These are the responsibility of the recipient unless stated otherwise at checkout. [REVIEW: decide whether you ship DDP or DDU]

## Tracking
You will receive a tracking number by email as soon as your order ships.

## Lost or damaged parcels
If your parcel is lost or arrives damaged, contact us at {{email}} within 14 days of the expected delivery date. [REVIEW]`,
  },
  returns: {
    title: "Returns & Refunds",
    description: "How to return an item and get a refund.",
    reviewed: false,
    body: `## 30-day returns
You can return unworn, unwashed items with original tags within 30 days of delivery. [REVIEW: check the statutory withdrawal period in your country — e.g. 14 days in the EU/UK, Israeli Consumer Protection law for IL customers]

## How to start a return
Email {{email}} with your order number and the items you want to return. We will send you the return address and instructions. Please do not send items back to the address on the parcel — it may be a supplier warehouse. [REVIEW]

## Refunds
Once we receive and inspect your return, we refund the item price to your original payment method within 14 days. Original shipping costs are non-refundable unless the item is faulty. [REVIEW: who pays return shipping]

## Exchanges
The fastest way to get a different size is to return the item for a refund and place a new order.

## Faulty or incorrect items
If you received a faulty or incorrect item, contact us within 14 days with photos and we will make it right at no cost to you.

## Non-returnable items
For hygiene reasons, [REVIEW: list items such as underwear, socks, face masks] cannot be returned unless faulty.`,
  },
  privacy: {
    title: "Privacy Policy",
    description: "How we collect and use your personal data.",
    reviewed: false,
    body: `[REVIEW: This is a template. Adapt to your legal entity, jurisdiction (GDPR, UK GDPR, CCPA, Israeli Privacy Protection Law…) and the tools you actually use.]

## Who we are
{{store}} ("we", "us") operates this website. Controller: [REVIEW: legal company name, registered address, company number]. Contact: {{email}}.

## What we collect
- Order data: name, email, shipping address, phone number, items purchased.
- Payment data: processed by our payment provider (Stripe). We never receive or store your full card number.
- Newsletter: your email address if you subscribe.
- Technical data: IP address and basic logs needed to run and secure the site.

## Why we use it
- To process and deliver your order (contract).
- To send order and shipping emails (contract).
- To send marketing emails if you opted in (consent — you can unsubscribe anytime).
- To prevent fraud and keep the site secure (legitimate interest).

## Who we share it with
- Fulfilment partners/suppliers that produce and ship your order (name, address, phone).
- Payment provider (Stripe), email provider, hosting provider. [REVIEW: list processors]
We do not sell your personal data.

## International transfers
Some partners are located outside your country. [REVIEW: describe safeguards, e.g. Standard Contractual Clauses]

## Retention
Order records are kept for as long as required by tax and accounting law. [REVIEW: e.g. 7 years]

## Your rights
You may request access, correction, deletion or a copy of your data, and object to marketing, by emailing {{email}}. You may also complain to your local data protection authority.

## Cookies
This site uses only essential storage (your shopping bag is kept in your browser's local storage; admin sessions use a secure cookie). [REVIEW: update if you add analytics or marketing pixels — you may then need a cookie banner]`,
  },
  terms: {
    title: "Terms of Service",
    description: "Terms and conditions for purchases on this website.",
    reviewed: false,
    body: `[REVIEW: Template terms — adapt to your jurisdiction and business before going live.]

## 1. About us
This website is operated by [REVIEW: legal company name, address, registration number, VAT number]. Contact: {{email}}.

## 2. Orders
Placing an order is an offer to buy. A contract is formed when we send the order confirmation email. We may refuse or cancel an order (e.g. pricing errors, suspected fraud, stock unavailability), in which case you will be fully refunded.

## 3. Prices and payment
Prices are shown in the store currency and include/exclude tax as indicated at checkout. Payment is taken at the time of order through our payment provider.

## 4. Delivery
Delivery terms are described on the Shipping & Delivery page. Risk passes to you on delivery.

## 5. Returns
Your return and withdrawal rights are described on the Returns & Refunds page and do not affect your statutory rights.

## 6. Product information
We try to show products accurately. Colours may vary slightly depending on your screen; measurements are approximate.

## 7. Intellectual property
All content on this website (designs, logos, images, text) belongs to {{store}} or its licensors and may not be used without permission.

## 8. Liability
Nothing in these terms limits liability that cannot be limited by law. [REVIEW]

## 9. Governing law
These terms are governed by the laws of [REVIEW: country/state]. Courts of [REVIEW] have jurisdiction.

## 10. Changes
We may update these terms from time to time. The version in force at the time of your order applies.`,
  },
};
