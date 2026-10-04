/**
 * Deletes ALL placeholder content created by the seed script (products, categories,
 * collections flagged isPlaceholder=true, and generated images in UPLOAD_DIR/seed).
 * Orders are kept (order items keep a snapshot of name/price).
 *   npm run seed:clear
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

export async function clearPlaceholders(db: PrismaClient) {
  const products = await db.product.deleteMany({ where: { isPlaceholder: true } });
  const collections = await db.collection.deleteMany({ where: { isPlaceholder: true } });
  // Only delete placeholder categories that no longer contain real products
  const categories = await db.category.deleteMany({ where: { isPlaceholder: true, products: { none: {} } } });
  const dir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads", "seed");
  await fs.rm(dir, { recursive: true, force: true });
  console.log(
    `✓ Removed placeholders: ${products.count} products, ${collections.count} collections, ${categories.count} categories, images in ${dir}`,
  );
}

const isMain = process.argv[1] && /clear-placeholders\.ts$/.test(process.argv[1]);
if (isMain) {
  const db = new PrismaClient();
  clearPlaceholders(db)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
