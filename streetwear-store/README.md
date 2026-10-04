# SOFT ARMOR — Streetwear Dropshipping Store

A production-ready e-commerce store for a designer-streetwear brand, built with **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + Prisma + Stripe Checkout**. It ships with a full admin panel and dropshipping supplier logic. It runs on a bare server IP over HTTP, and switching to a domain with automatic HTTPS takes **one env variable + one config line**.

> The brand name, colours, fonts and every piece of placeholder content can be changed. See [Re-theming](#re-theming) and [Removing placeholder content](#removing-placeholder-content).

---

## Contents

1. [Features](#features)
2. [Local setup](#local-setup)
3. [Environment variables](#environment-variables)
4. [Adding products](#adding-products)
5. [Connecting a real supplier](#connecting-a-real-supplier)
6. [Deploying on a VPS by IP](#deploying-on-a-vps-by-ip)
7. [Switching to a domain (HTTPS)](#switching-to-a-domain)
8. [Switching Stripe from test to live](#switching-stripe-from-test-to-live)
9. [Email (SMTP)](#email-smtp)
10. [Architecture & project structure](#architecture--project-structure)
11. [Security](#security)
12. [Operations: backups, updates, logs](#operations)
13. [Before you launch: checklist](#before-you-launch-checklist)

---

## Features

**Storefront**

- Home page with hero, featured collections, new arrivals, brand story and newsletter signup.
- Category, collection and search pages. Filters for size, colour, price and category, plus sorting and pagination. Filters live in the URL, so filtered pages can be shared.
- Product page: gallery with hover zoom and a fullscreen lightbox (swipe on mobile), and colour/size variants with live stock status. The gallery switches to the selected colour's images. Also a size-guide modal, shipping/returns info and related products.
- Persistent cart (localStorage) in a slide-out drawer, plus a one-page checkout (email, address, shipping method, then payment).
- Order confirmation page and confirmation email. A shipping email is sent when tracking is added.
- Static pages: About, Contact (with form), Shipping, Returns, Privacy, Terms. Template legal text shows a visible **"owner must review"** banner, and `[REVIEW]` markers are highlighted.
- SEO: per-page metadata, Open Graph, `sitemap.xml`, `robots.txt`, JSON-LD (Product, BreadcrumbList, WebSite + SearchAction). Canonical URLs come from `SITE_URL`.
- Performance: `next/image` (AVIF/WebP, lazy loading, responsive sizes) and self-hosted fonts. Lighthouse on mobile measured **89–94 performance, 96–100 accessibility, 100 best practices, 100 SEO**.
- Multi-currency ready: prices are integers in minor units, currency and locale come from env/settings, and tax can be included (VAT) or added on top.
- RTL ready: logical CSS properties throughout. Set `TEXT_DIRECTION=rtl` and `LOCALE=he-IL` for Hebrew.

**Dropshipping**

- Supplier fields on every product: `supplierName`, `supplierSku`, `supplierUrl`, `supplierCost`, `retailPrice`, auto-calculated `margin`. Variants also carry a `supplierSku` (the supplier's variant ID).
- **Price rule:** `retailPrice = supplierCost × markup`, rounded up to a whole unit, with a per-product manual override. Changing the markup can recalculate all prices.
- When an order is paid, one **supplier order** is created per supplier (status `pending → placed → shipped → delivered`). It contains the customer's shipping details and a copy-ready text block to forward to the supplier.
- Supplier adapter interface (`src/lib/suppliers/`): a **CSV adapter** that works out of the box, plus documented **CJ Dropshipping** and **Spocket** stubs.
- Each order has a tracking number. Adding one sets the order to `shipped` and emails the customer.

**Admin (`/admin`)**

- bcrypt passwords, DB-backed sessions (httpOnly cookie) and login rate limiting. The first admin is created from env.
- Dashboard: revenue (all time / 30 days), paid orders, AOV, orders waiting to be forwarded to suppliers, top products, low stock and recent orders.
- CRUD for products (variants, image upload/reorder/colour-tagging, collections), categories and collections.
- Orders: filters by status, search and date. The order detail page has status updates, tracking entry, refund note, supplier orders and profit per order.
- CSV import/export of products, plus a downloadable template.
- Settings: store name, logo, currency, markup, tax rate and mode, announcement bar, shipping rates and contact email. You can also change the admin password there.

---

## Local setup

Requirements: **Node.js 20+** (22 recommended) and npm.

```bash
cd streetwear-store
cp .env.example .env
# Edit .env for local development:
#   DATABASE_URL="file:./dev.db"
#   SITE_URL="http://localhost:3000"
#   PAYMENT_PROVIDER="mock"        # or "stripe" with your sk_test_ key
#   ADMIN_EMAIL / ADMIN_PASSWORD   # your first admin login

npm install
npm run setup        # creates the SQLite DB (prisma db push) + seeds 12 placeholder products
npm run dev          # http://localhost:3000   (admin: http://localhost:3000/admin)
```

Useful scripts:

| Command                               | What it does                                                          |
| ------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                         | Development server                                                    |
| `npm run build` / `npm start`         | Production build / server                                             |
| `npm test`                            | Unit + integration tests (cart, totals, pricing, CSV, orders, Stripe) |
| `npm run lint` / `npm run typecheck`  | ESLint / TypeScript                                                   |
| `npm run format`                      | Prettier                                                              |
| `npm run db:push`                     | Sync the DB schema (picks SQLite/PostgreSQL from `DATABASE_URL`)      |
| `npm run seed` / `npm run seed:clear` | Add / remove placeholder content                                      |
| `npm run db:studio`                   | Prisma Studio (DB browser)                                            |

**Payments locally:** `PAYMENT_PROVIDER=mock` gives you a local "Simulate payment" page, so you can test the full flow offline. To test real Stripe Checkout locally, set `PAYMENT_PROVIDER=stripe` and `STRIPE_SECRET_KEY=sk_test_…`, then pay with card `4242 4242 4242 4242` (any future date, any CVC). Orders are confirmed when Stripe redirects back, even without a webhook. To also test webhooks locally, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example). The important ones:

| Variable                                                       | Purpose                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                                                     | Public base URL (canonical URLs, sitemap, emails, Stripe redirects). No domain/IP is hardcoded anywhere else. |
| `DATABASE_URL`                                                 | `file:./dev.db` (SQLite) or `postgresql://…`. The Prisma provider follows automatically.                      |
| `CURRENCY`, `LOCALE`, `TEXT_DIRECTION`                         | Default currency (ISO), number formatting, `ltr`/`rtl`                                                        |
| `TAX_RATE`, `PRICES_INCLUDE_TAX`                               | e.g. `0.17` + `true` for Israeli VAT-inclusive prices                                                         |
| `PRICE_MARKUP`                                                 | Default markup multiplier (editable in Admin → Settings)                                                      |
| `PAYMENT_PROVIDER`, `STRIPE_*`                                 | Payments                                                                                                      |
| `MAIL_TRANSPORT`, `SMTP_*`, `MAIL_FROM`                        | Email                                                                                                         |
| `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`              | Admin security / first admin                                                                                  |
| `STORAGE_DRIVER`, `UPLOAD_DIR`                                 | Image uploads (`local` volume; S3 stub ready)                                                                 |
| `SUPPLIER_ADAPTER`, `SUPPLIER_AUTO_PLACE`, `CJ_*`, `SPOCKET_*` | Supplier integration                                                                                          |

Store name, logo, currency, markup, tax, announcement, contact email and shipping rates can be changed at runtime in **Admin → Settings**. Those values override the env defaults.

> **Currency note:** changing the currency only changes the label and formatting. It does **not** convert existing prices. Re-price your products (or re-import the CSV) after switching.

---

## Adding products

**Option 1: in the admin panel.** Go to Admin → Products → **New product** and fill in:

1. Name, description, details (one bullet per line) and tags (used by search).
2. Supplier name, SKU, URL and **supplier cost**. The retail price is calculated from the markup automatically. Tick "Set retail price manually" to override it.
3. Variants: use **"Add colour × size run"** to create e.g. Black × S/M/L/XL in one go. Set the stock and the supplier's variant ID.
4. Images: upload JPG/PNG/WebP files. They are re-encoded to WebP, max 2000px, with metadata stripped. Tag each image with a colour so the product gallery switches when a customer picks that colour. The first image is the main one.
5. Set the status to **Active** to publish.

**Option 2: CSV import.** Go to Admin → Import / Export.

- One row per **variant**. Rows that share a `handle` become one product. Products are matched by `handle` and variants by `variant_sku`, so importing again **updates** them.
- Prices are in major units (`12.50`). Leave `retail_price` empty to use the markup rule, or set `price_override=true` with a `retail_price`.
- `images` is a `|`-separated list of URLs. Remote images are **downloaded to your server** at import time.
- `details` uses `\n` for line breaks. `collections` is a `|`-separated list of collection slugs.
- Example file: [`docs/sample-products.csv`](docs/sample-products.csv). You can also click **Export** to get every product in the same format, edit it in a spreadsheet and re-import.

---

## Connecting a real supplier

How it works today (CSV adapter):

1. A customer pays, which creates a **supplier order** for each supplier. Admin → **Supplier orders** lists the pending ones (and the dashboard counts them).
2. Open the order. Copy the pre-formatted block (items with supplier SKUs/URLs plus the customer's shipping address) into your supplier's dashboard (CJ, Spocket, AliExpress, a print-on-demand partner, …).
3. Set the supplier order to **placed** and enter the supplier's order number.
4. When the supplier ships, enter their tracking number and tick **"Copy tracking # to the customer order and email the customer"**.

**Automating with an API (CJ Dropshipping example):**

1. Get API access from CJ (Developer → API key) and set:
   ```env
   SUPPLIER_ADAPTER="cj"
   CJ_API_EMAIL="you@example.com"
   CJ_API_KEY="…"
   SUPPLIER_AUTO_PLACE="true"     # forward paid orders automatically
   ```
2. Complete the `TODO` blocks in [`src/lib/suppliers/cj-dropshipping.ts`](src/lib/suppliers/cj-dropshipping.ts). Authentication is already implemented. The endpoints and the payload mapping for `createOrderV2`, product list and tracking are documented inline. Check the field names against the current CJ docs.
3. Put CJ's variant IDs (`vid`) in each variant's **Supplier SKU / ID** field (CSV column `variant_supplier_sku`). `placeOrder()` sends these.
4. Once `placeOrder()` returns CJ's order id, paid orders are forwarded automatically, and the supplier order flips to `placed` with the reference stored.

**Spocket:** see [`src/lib/suppliers/spocket.ts`](src/lib/suppliers/spocket.ts). Spocket API access is partner-only. Until you have it, export from Spocket and use the CSV import.
**Any other supplier:** implement the `SupplierAdapter` interface ([`types.ts`](src/lib/suppliers/types.ts)) and register it in [`index.ts`](src/lib/suppliers/index.ts).

---

## Deploying on a VPS by IP

Tested stack: **Caddy (port 80/443) → Next.js app → PostgreSQL 16**. It uses Docker volumes for the database, uploads and certificates, runs a healthcheck on `/api/health`, and has `restart: unless-stopped` on every service.

**Server:** Ubuntu 22.04/24.04, 1 vCPU / 2 GB RAM minimum (the first Docker build needs about 1.5 GB of RAM; add swap on 1 GB machines).

### One command

```bash
# on the server, as root — clone the repo (or scp/rsync the folder), then:
cd streetwear-store
sudo bash deploy.sh
```

…or let the script clone the repo for you:

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/<branch>/streetwear-store/deploy.sh -o deploy.sh
sudo REPO_URL=https://github.com/<you>/<repo>.git REPO_SUBDIR=streetwear-store bash deploy.sh
```

The script:

1. Installs Docker.
2. Copies the project to `/opt/streetwear-store`.
3. Creates `.env` with a detected `SITE_URL=http://<public-ip>` and generated DB password, session secret and admin password.
4. Opens ports 80/443 in ufw.
5. Runs `docker compose up -d --build`.
6. Waits for the health check.
7. Seeds the placeholder catalog on the first install.
8. Prints the store URL and admin credentials.

The schema sync (`prisma db push`) runs automatically every time the app container starts. It refuses destructive changes, so data is never dropped silently. Re-run `deploy.sh` at any time to update; `.env` and all data are kept.

### Manually

```bash
cp .env.example .env     # set SITE_URL=http://YOUR_IP, POSTGRES_PASSWORD, SESSION_SECRET, ADMIN_*, Stripe, SMTP
docker compose up -d --build
docker compose exec app node_modules/.bin/tsx prisma/seed.ts   # optional placeholder catalog
curl http://YOUR_IP/api/health                                  # {"status":"ok","db":"ok",…}
```

After editing `.env`, run `docker compose up -d` again so the app picks up the changes.

<a id="switching-to-a-domain"></a>

## Switching to a domain (automatic HTTPS)

1. **Buy a domain** (Namecheap, Cloudflare, Porkbun, …).
2. **Point DNS to the server:** create an `A` record for `shop.example.com` (and optionally `www`) with your server's IP. Wait until `ping shop.example.com` shows your IP.
3. **Set the URL:** in `.env` change
   ```env
   SITE_URL="https://shop.example.com"
   ```
4. **Enable HTTPS in Caddy:** in `Caddyfile`, change the first line from `:80 {` to
   ```
   shop.example.com, www.shop.example.com {
   ```
   A ready-made version with a www→apex redirect and HSTS is in [`Caddyfile.domain`](Caddyfile.domain). You can simply run `cp Caddyfile.domain Caddyfile` and replace `shop.example.com` with your domain.
5. Apply:
   ```bash
   docker compose up -d
   docker compose restart caddy
   ```

Caddy gets and renews the Let's Encrypt certificate automatically (ports 80 and 443 must be reachable). The admin session cookie automatically becomes `Secure` once `SITE_URL` starts with `https://`. Remember to update your Stripe webhook URL to the new domain.

---

## Switching Stripe from test to live

1. In the Stripe dashboard, finish **account activation** (business details, bank account).
2. **Test first**, while still using test keys (`sk_test_…`). Place an order with `4242 4242 4242 4242` and check that it appears in Admin → Orders as **paid**.
3. **Create the live webhook:** Developers → Webhooks → _Add endpoint_ (with the dashboard toggled to **live** mode).
   - URL: `https://shop.example.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`
4. **Set the live keys** in `.env`:
   ```env
   PAYMENT_PROVIDER="stripe"
   STRIPE_SECRET_KEY="sk_live_…"
   STRIPE_WEBHOOK_SECRET="whsec_…"   # the live endpoint's signing secret
   ```
5. Run `docker compose up -d`. The admin header shows **"STRIPE TEST MODE"** while a test key is active, and Admin → Settings shows `stripe (LIVE)` once the live key is in place.
6. Make one real low-value purchase and refund it from the Stripe dashboard.

Use **HTTPS (a domain)** before going live. Payments themselves happen on Stripe's hosted page, but customers' addresses and emails shouldn't travel over plain HTTP. Refunds are issued in the Stripe dashboard; use Admin → Order → _Refund note_ to record them.

**Adding another payment provider:** implement `PaymentProvider` in `src/lib/payments/<name>.ts`, register it in `src/lib/payments/index.ts`, and add a webhook route that calls `finalizePaidOrder()`.

---

## Email (SMTP)

By default (`MAIL_TRANSPORT=console`), emails are printed to the app log: `docker compose logs -f app`. For real delivery, use any SMTP provider (Postmark, Amazon SES, Mailgun, Brevo, Google Workspace…):

```env
MAIL_TRANSPORT="smtp"
MAIL_FROM="SOFT ARMOR <orders@shop.example.com>"
SMTP_HOST="smtp.postmarkapp.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="…"
SMTP_PASS="…"
```

Set up SPF and DKIM DNS records for your sending domain (your provider shows you how), or the emails will land in spam. Emails sent: order confirmation, shipping update (with tracking) and contact-form messages (to `CONTACT_EMAIL`).

---

## Architecture & project structure

```
streetwear-store/
├─ prisma/
│  ├─ schema.prisma            # provider-agnostic schema (SQLite ⇄ PostgreSQL)
│  ├─ seed.ts, seed-data.ts    # placeholder catalog (flagged isPlaceholder)
│  ├─ placeholder-art.ts       # generates the placeholder garment images
│  └─ clear-placeholders.ts    # npm run seed:clear
├─ scripts/
│  ├─ select-db-provider.mjs   # sets the Prisma provider from DATABASE_URL
│  ├─ docker-entrypoint.sh     # provider check → schema sync → optional seed → start
│  └─ generate-brand-images.ts # regenerates public/brand/* placeholders
├─ src/
│  ├─ app/
│  │  ├─ (store)/              # storefront routes (home, shop, category, collections, product, search,
│  │  │                        #   checkout, order, about, contact, shipping, returns, privacy, terms)
│  │  ├─ admin/                # admin login + (panel)/ dashboard, products, categories, collections,
│  │  │                        #   orders, supplier-orders, import-export, settings
│  │  ├─ api/                  # health, cart/quote, checkout, webhooks/stripe, payments/mock,
│  │  │                        #   newsletter, contact, admin/products/export
│  │  ├─ uploads/[...path]/    # serves the uploads volume
│  │  ├─ sitemap.ts, robots.ts
│  ├─ components/store|admin|ui
│  ├─ content/pages.ts         # static/legal page text  ← REVIEW BEFORE LAUNCH
│  ├─ lib/
│  │  ├─ env.ts settings.ts    # validated config (runtime, never baked into the build)
│  │  ├─ money.ts pricing.ts totals.ts cart.ts   # pure, unit-tested logic
│  │  ├─ orders.ts             # quote → pending order → finalizePaidOrder (idempotent) → tracking
│  │  ├─ catalog.ts products.ts
│  │  ├─ payments/             # PaymentProvider: stripe, mock
│  │  ├─ suppliers/            # SupplierAdapter: csv, cj-dropshipping (stub), spocket (stub)
│  │  ├─ storage/              # Storage: local (default), S3 (stub)
│  │  ├─ mailer/               # Mailer: console, smtp + templates
│  │  ├─ auth.ts rate-limit.ts validation/ admin/ (server actions)
│  ├─ middleware.ts            # CSRF origin check + admin gate
│  └─ styles/tokens.css        # ALL design tokens
├─ tests/                      # vitest
├─ Dockerfile  docker-compose.yml  Caddyfile  Caddyfile.domain  deploy.sh  .env.example
```

**Order lifecycle:**

1. The cart holds only `{variantId, quantity}`. `/api/cart/quote` prices it **from the database**.
2. `POST /api/checkout` validates the request (zod), re-prices everything server-side, checks stock, creates a `pending` order with an address snapshot, and opens a Stripe Checkout Session for exactly that total.
3. Stripe redirects to `/checkout/success`, which verifies the session with Stripe. The webhook does the same independently. Both call `finalizePaidOrder()`, which is **idempotent**: in one transaction it marks the order `paid`, decrements stock and creates the supplier orders, then sends the confirmation email.
4. Unpaid sessions expire after 1 hour and the order is marked `cancelled` (via webhook).

### Re-theming

- **Colours, fonts, radius, motion:** [`src/styles/tokens.css`](src/styles/tokens.css). The accent colour is `--brand-accent`.
- **Fonts:** self-hosted through `@fontsource` (Anton + Inter). To change them, install another `@fontsource/*` package, import it in `src/app/layout.tsx` and update `--brand-font-*`.
- **Brand imagery:** replace `public/brand/hero.webp`, `story.webp` and `og.jpg` (1200×630), plus `public/favicon.svg`.
- **Logo and store name:** Admin → Settings.
- **RTL / Hebrew:** set `TEXT_DIRECTION=rtl` and `LOCALE=he-IL`. Layouts use logical properties (`ms-`, `ps-`, `start-`, `end-`), so they mirror automatically. The UI strings are in English in the components, so translate them, or add an i18n library such as `next-intl` when you add Hebrew.

### Removing placeholder content

All seeded categories, collections and products carry `isPlaceholder = true`.

```bash
npm run seed:clear                                                   # local
docker compose exec app node_modules/.bin/tsx prisma/clear-placeholders.ts   # Docker
```

This deletes the placeholder products, collections, unused placeholder categories and the generated images in `uploads/seed`. Orders are kept (order items store a snapshot). Editing a placeholder category or collection in the admin marks it as real, so it won't be deleted.

---

## Security

- **Validation:** every API route and server action validates its input with **zod**.
- **Pricing is server-side only.** Client prices are never read. Stripe receives amounts computed from the database.
- **CSRF:** the middleware rejects any `POST/PUT/PATCH/DELETE` whose `Origin`/`Referer` doesn't match the host. This covers API routes and server actions. Stripe webhooks are exempt but verified by signature.
- **Admin:**
  - bcrypt (cost 12) passwords with timing-safe login.
  - Rate limiting per IP (10 per 15 min) and per account (5 per 15 min).
  - Random session tokens stored as HMACs in the DB, in an httpOnly `SameSite=Lax` cookie that becomes `Secure` on HTTPS.
  - Every admin page, action and admin API checks the session on the server.
- **Headers:** CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and COOP. HSTS is set by Caddy in the domain config.
- **Uploads:** decoded with sharp (not trusted by extension), re-encoded to WebP with metadata stripped, size-limited, and served with path-traversal protection.
- **Order pages** need a secret per-order token (compared in constant time). Order IDs alone can't be enumerated.
- **Rate limits** also apply to checkout, cart quotes, newsletter and contact.
- **No secrets in the repo:** `.env` is git-ignored, and `deploy.sh` generates the secrets.

Note: the rate limiter is in-memory. That is right for one app container, but use Redis (same interface in `src/lib/rate-limit.ts`) if you scale to multiple replicas.

<a id="operations"></a>

## Operations: backups, updates, logs

```bash
cd /opt/streetwear-store
docker compose ps                         # status + health
docker compose logs -f app                # app logs (also emails in console mode)
# Backup database + uploads
docker compose exec -T db pg_dump -U store store | gzip > backup-$(date +%F).sql.gz
docker run --rm -v streetwear-store_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
# Update to a new version
sudo bash deploy.sh                       # or: git pull && docker compose up -d --build
```

Schedule the backup commands with cron and copy the files off the server.

---

## Before you launch: checklist

- [ ] Set real `ADMIN_EMAIL`, log in and **change the admin password** (Admin → Settings).
- [ ] Remove placeholder content (`seed:clear`) and add real products with real photos.
- [ ] Replace the brand imagery in `public/brand/` and set the store name and logo.
- [ ] **Review all legal texts** in `src/content/pages.ts` (every `[REVIEW]` marker), then set `reviewed: true`.
- [ ] Check the **size guide** measurements in `src/components/store/SizeGuide.tsx`.
- [ ] Set currency, tax rate and tax mode, markup and shipping rates (Admin → Settings), and the shipping countries (`src/lib/countries.ts`).
- [ ] Connect a domain plus HTTPS, then switch Stripe to live and add the webhook.
- [ ] Configure SMTP and verify that confirmation emails arrive (check spam, add SPF/DKIM).
- [ ] Set up backups.
