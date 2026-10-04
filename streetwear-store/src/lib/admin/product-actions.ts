"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMajor, toMinor } from "@/lib/money";
import { applyPricing } from "@/lib/pricing";
import { buildSearchText, importProducts, recalculateAllPrices } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { getStorage, saveImage } from "@/lib/storage";
import { parseProductsCsv } from "@/lib/suppliers/csv";
import { PRODUCT_STATUSES, slugify, slugSchema } from "@/lib/validation";
import { bool, files, str, type ActionState } from "./form";

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,3})?$/, "Enter a price like 29.90");
const optionalMoney = z.union([z.literal(""), money]);

const variantSchema = z.object({
  id: z.string().max(64).optional(),
  sku: z
    .string()
    .trim()
    .min(1, "SKU required")
    .max(64)
    .transform((v) => v.toUpperCase()),
  size: z.string().trim().min(1, "Size required").max(30),
  color: z.string().trim().min(1, "Colour required").max(40),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "Colour hex like #111111"),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  supplierSku: z.string().trim().max(100).default(""),
});

const imageSchema = z.object({
  id: z.string().max(64),
  alt: z.string().trim().max(200).default(""),
  color: z.string().trim().max(40).nullable().default(null),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: slugSchema,
  description: z.string().trim().max(5000),
  details: z.string().trim().max(5000),
  status: z.enum(PRODUCT_STATUSES),
  tags: z.string().trim().max(500),
  categoryId: z.string().max(64),
  supplierName: z.string().trim().max(100),
  supplierSku: z.string().trim().max(100),
  supplierUrl: z.union([z.literal(""), z.string().trim().url().max(500)]),
  supplierCost: money,
  retailPrice: optionalMoney,
  compareAtPrice: optionalMoney,
});

export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const { markup, currency } = await getSettings();
  const id = str(fd, "id") || null;

  const parsed = productSchema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug") || slugify(str(fd, "name")),
    description: str(fd, "description"),
    details: str(fd, "details"),
    status: str(fd, "status"),
    tags: str(fd, "tags"),
    categoryId: str(fd, "categoryId"),
    supplierName: str(fd, "supplierName"),
    supplierSku: str(fd, "supplierSku"),
    supplierUrl: str(fd, "supplierUrl"),
    supplierCost: str(fd, "supplierCost") || "0",
    retailPrice: str(fd, "retailPrice"),
    compareAtPrice: str(fd, "compareAtPrice"),
  });
  if (!parsed.success) {
    const i = parsed.error.issues[0]!;
    return { error: `${i.path.join(".")}: ${i.message}` };
  }
  let variants: z.infer<typeof variantSchema>[];
  let images: z.infer<typeof imageSchema>[];
  try {
    variants = z
      .array(variantSchema)
      .max(200)
      .parse(JSON.parse(str(fd, "variants") || "[]"));
    images = z
      .array(imageSchema)
      .max(50)
      .parse(JSON.parse(str(fd, "images") || "[]"));
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]!.message : "Invalid variant data";
    return { error: `Variants/images: ${msg}` };
  }
  const combos = new Set(variants.map((v) => `${v.size}|${v.color}`));
  if (combos.size !== variants.length) return { error: "Each size + colour combination must be unique." };
  if (new Set(variants.map((v) => v.sku)).size !== variants.length)
    return { error: "Variant SKUs must be unique." };

  const d = parsed.data;
  const priceOverride = bool(fd, "priceOverride");
  if (priceOverride && !d.retailPrice)
    return { error: "Enter a retail price or disable the manual override." };
  const pricing = applyPricing(
    {
      supplierCost: toMinor(d.supplierCost, currency),
      retailPrice: d.retailPrice ? toMinor(d.retailPrice, currency) : 0,
      priceOverride,
    },
    markup,
    currency,
  );
  const category = d.categoryId ? await db.category.findUnique({ where: { id: d.categoryId } }) : null;
  const collectionIds = fd.getAll("collectionIds").map(String).filter(Boolean);

  const data = {
    name: d.name,
    slug: d.slug,
    description: d.description,
    details: d.details,
    status: d.status,
    featured: bool(fd, "featured"),
    tags: d.tags,
    searchText: buildSearchText({
      name: d.name,
      description: d.description,
      tags: d.tags,
      categoryName: category?.name,
    }),
    supplierName: d.supplierName,
    supplierSku: d.supplierSku,
    supplierUrl: d.supplierUrl,
    supplierCost: toMinor(d.supplierCost, currency),
    compareAtPrice: d.compareAtPrice ? toMinor(d.compareAtPrice, currency) : null,
    priceOverride,
    ...pricing,
  };

  let productId = id;
  try {
    // upload new images first (outside the transaction – file IO)
    const uploaded: string[] = [];
    for (const f of files(fd, "newImages"))
      uploaded.push(await saveImage(Buffer.from(await f.arrayBuffer()), "products"));
    const newImageColor = str(fd, "newImageColor") || null;

    await db.$transaction(async (tx) => {
      const product = productId
        ? await tx.product.update({
            where: { id: productId },
            data: {
              ...data,
              category: category ? { connect: { id: category.id } } : { disconnect: true },
              collections: { set: collectionIds.map((cid) => ({ id: cid })) },
            },
          })
        : await tx.product.create({
            data: {
              ...data,
              category: category ? { connect: { id: category.id } } : undefined,
              collections: { connect: collectionIds.map((cid) => ({ id: cid })) },
            },
          });
      productId = product.id;

      // variants: delete removed, update existing, create new
      const keepIds = variants.map((v) => v.id).filter((x): x is string => !!x);
      await tx.variant.deleteMany({ where: { productId: product.id, id: { notIn: keepIds } } });
      for (const [position, v] of variants.entries()) {
        const vd = {
          sku: v.sku,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          stock: v.stock,
          supplierSku: v.supplierSku,
          position,
        };
        if (v.id) await tx.variant.update({ where: { id: v.id, productId: product.id }, data: vd });
        else await tx.variant.create({ data: { ...vd, productId: product.id } });
      }

      // images: keep the ordered list from the form, delete the rest
      const keepImageIds = images.map((i) => i.id);
      await tx.productImage.deleteMany({ where: { productId: product.id, id: { notIn: keepImageIds } } });
      for (const [position, img] of images.entries()) {
        await tx.productImage.update({
          where: { id: img.id, productId: product.id },
          data: { position, alt: img.alt, color: img.color || null },
        });
      }
      if (uploaded.length) {
        await tx.productImage.createMany({
          data: uploaded.map((url, i) => ({
            productId: product.id,
            url,
            alt: d.name,
            color: newImageColor,
            position: images.length + i,
          })),
        });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Slug or a variant SKU is already used by another product." };
    }
    console.error("[admin] save product failed", err);
    return { error: (err as Error).message || "Could not save product." };
  }

  revalidatePath("/", "layout");
  redirect(
    `/admin/products/${productId}?saved=${encodeURIComponent(
      `${id ? "Saved" : "Product created"}. Retail price ${toMajor(pricing.retailPrice, currency)} ${currency}, margin ${toMajor(pricing.margin, currency)} ${currency}.`,
    )}`,
  );
}

export async function deleteProductAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const product = await db.product.findUnique({ where: { id }, include: { images: true } });
  if (product) {
    await db.product.delete({ where: { id } });
    for (const img of product.images) {
      const stillUsed = await db.productImage.count({ where: { url: img.url } });
      if (!stillUsed)
        await getStorage()
          .delete(img.url)
          .catch(() => undefined);
    }
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function recalculatePricesAction(_prev: ActionState): Promise<ActionState> {
  await requireAdmin();
  const changed = await recalculateAllPrices();
  revalidatePath("/", "layout");
  return { ok: true, message: `Prices recalculated – ${changed} product(s) changed.` };
}

export async function importCsvAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = files(fd, "file")[0];
  if (!file) return { error: "Choose a CSV file." };
  if (file.size > 5 * 1024 * 1024) return { error: "CSV is larger than 5 MB." };
  const { currency } = await getSettings();
  const { products, errors } = parseProductsCsv(await file.text(), currency);
  if (products.length === 0) return { error: `No products found. ${errors.slice(0, 3).join("; ")}` };
  const report = await importProducts(products);
  revalidatePath("/", "layout");
  const allErrors = [...errors, ...report.errors];
  return {
    ok: true,
    message: `Imported: ${report.created} created, ${report.updated} updated, ${report.variants} variants.${
      allErrors.length
        ? ` Warnings: ${allErrors.slice(0, 5).join("; ")}${allErrors.length > 5 ? "…" : ""}`
        : ""
    }`,
  };
}
