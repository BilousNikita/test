/**
 * Seeds the store with placeholder content so it looks complete immediately.
 *   npm run seed            – creates admin (from env), shipping methods, categories, collections, 12 products
 *   npm run seed -- --reset – removes existing placeholder content first
 * Remove all placeholder content later with: npm run seed:clear
 */
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { CATEGORIES, COLLECTIONS, COLORS, PRODUCTS } from "./seed-data";
import { renderComposition, renderDetail, renderGarment } from "./placeholder-art";
import { clearPlaceholders } from "./clear-placeholders";

const db = new PrismaClient();
const MARKUP = Number(process.env.PRICE_MARKUP ?? 2.5);
const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads");

async function writeUpload(rel: string, data: Buffer) {
  const full = path.join(UPLOAD_DIR, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return `/uploads/${rel}`;
}

const priceFromCost = (cost: number) => Math.ceil((cost * MARKUP) / 100) * 100;

// deterministic pseudo-random stock (a few sold-out sizes to demo stock states)
function stockFor(i: number, j: number, k: number) {
  const v = (i * 7 + j * 13 + k * 5) % 11;
  return v === 0 ? 0 : v === 1 ? 2 : 5 + v * 3;
}

async function main() {
  const reset = process.argv.includes("--reset");

  // 1) First admin from env
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && (await db.adminUser.count()) === 0) {
    await db.adminUser.create({ data: { email, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`✓ Admin user created: ${email}`);
  }

  // 2) Shipping methods (real configuration, not placeholder – edit them in Admin → Settings)
  if ((await db.shippingMethod.count()) === 0) {
    await db.shippingMethod.createMany({
      data: [
        {
          name: "Standard",
          description: "Tracked, 6–12 business days",
          price: 800,
          freeOver: 15000,
          minDays: 6,
          maxDays: 12,
          position: 0,
        },
        {
          name: "Express",
          description: "Tracked priority, 3–6 business days",
          price: 1900,
          minDays: 3,
          maxDays: 6,
          position: 1,
        },
      ],
    });
    console.log("✓ Shipping methods created");
  }

  const existing = await db.product.count({ where: { isPlaceholder: true } });
  if (existing > 0 && !reset) {
    console.log(
      `• ${existing} placeholder products already exist – skipping (use "npm run seed -- --reset" to recreate).`,
    );
    return;
  }
  if (reset) await clearPlaceholders(db);

  // 3) Categories
  const categoryIds = new Map<string, string>();
  for (const [position, c] of CATEGORIES.entries()) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, position, isPlaceholder: true },
    });
    categoryIds.set(c.slug, cat.id);
  }
  console.log(`✓ ${CATEGORIES.length} categories`);

  // 4) Collections (with generated cover images)
  for (const [position, c] of COLLECTIONS.entries()) {
    const img = await renderComposition({
      width: 1200,
      height: 1500,
      bg: c.bg,
      items: [{ garment: c.garment, color: COLORS[c.color], x: 0, y: 0, scale: 1 }],
    });
    const imageUrl = await writeUpload(`seed/collection-${c.slug}.webp`, img);
    await db.collection.upsert({
      where: { slug: c.slug },
      update: { imageUrl },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl,
        position,
        isPlaceholder: true,
      },
    });
  }
  console.log(`✓ ${COLLECTIONS.length} collections`);

  // 5) Products, variants, images
  const now = Date.now();
  for (const [i, p] of PRODUCTS.entries()) {
    const images: { url: string; color: string | null; alt: string }[] = [];
    for (const [ci, colorName] of p.colors.entries()) {
      const color = COLORS[colorName];
      images.push({
        url: await writeUpload(
          `seed/${p.slug}-${ci}-front.webp`,
          await renderGarment({ garment: p.garment, color }),
        ),
        color: colorName,
        alt: `${p.name} in ${colorName} – front`,
      });
      if (ci === 0) {
        images.push({
          url: await writeUpload(
            `seed/${p.slug}-${ci}-back.webp`,
            await renderGarment({ garment: p.garment, color, back: true, bg: "#e2ded5" }),
          ),
          color: colorName,
          alt: `${p.name} in ${colorName} – back`,
        });
        images.push({
          url: await writeUpload(
            `seed/${p.slug}-${ci}-detail.webp`,
            await renderDetail({ garment: p.garment, color }),
          ),
          color: colorName,
          alt: `${p.name} in ${colorName} – detail`,
        });
      }
    }

    const override = p.retailPrice != null;
    const retailPrice = override ? p.retailPrice! : priceFromCost(p.supplierCost);
    const category = CATEGORIES.find((c) => c.slug === p.category)!;

    await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        details: p.details.join("\n"),
        status: "active",
        featured: !!p.featured,
        tags: p.tags,
        searchText: [p.name, p.tags, category.name, p.description].join(" ").toLowerCase(),
        category: { connect: { id: categoryIds.get(p.category)! } },
        collections: { connect: p.collections.map((slug) => ({ slug })) },
        supplierName: p.supplierName,
        supplierSku: p.supplierSku,
        supplierUrl: `https://supplier.example.com/products/${p.supplierSku.toLowerCase()}`,
        supplierCost: p.supplierCost,
        retailPrice,
        compareAtPrice: p.compareAtPrice ?? null,
        priceOverride: override,
        margin: retailPrice - p.supplierCost,
        isPlaceholder: true,
        createdAt: new Date(now - i * 86_400_000),
        images: { create: images.map((img, position) => ({ ...img, position })) },
        variants: {
          create: p.colors.flatMap((colorName, ci) =>
            p.sizes.map((size, si) => ({
              sku: `${p.supplierSku}-${colorName.replace(/\s+/g, "").slice(0, 4).toUpperCase()}-${size.replace(/\s+/g, "").toUpperCase()}`,
              size,
              color: colorName,
              colorHex: COLORS[colorName],
              stock: stockFor(i, ci, si),
              supplierSku: `${p.supplierSku}-${ci}${si}`,
              position: ci * 100 + si,
            })),
          ),
        },
      },
    });
  }
  console.log(`✓ ${PRODUCTS.length} products with variants and images`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
