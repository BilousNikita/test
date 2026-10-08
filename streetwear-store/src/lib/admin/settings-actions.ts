"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { recalculateAllPrices } from "@/lib/products";
import { getSettings, saveSettings, settingsSchema } from "@/lib/settings";
import { saveImage } from "@/lib/storage";
import { bool, files, str, type ActionState } from "./form";

export async function saveSettingsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const before = await getSettings();
  const parsed = settingsSchema.omit({ logoUrl: true }).safeParse({
    storeName: str(fd, "storeName"),
    currency: str(fd, "currency"),
    taxRateBps: Math.round(Number(str(fd, "taxRate") || "0") * 100),
    pricesIncludeTax: bool(fd, "pricesIncludeTax"),
    markup: Number(str(fd, "markup")),
    contactEmail: str(fd, "contactEmail"),
    announcement: str(fd, "announcement"),
  });
  if (!parsed.success) {
    const i = parsed.error.issues[0]!;
    return { error: `${i.path.join(".")}: ${i.message}` };
  }
  let logoUrl: string | null | undefined;
  try {
    const logo = files(fd, "logo")[0];
    if (logo) logoUrl = await saveImage(Buffer.from(await logo.arrayBuffer()), "brand");
  } catch (err) {
    return { error: (err as Error).message };
  }
  if (bool(fd, "removeLogo")) logoUrl = null;

  await saveSettings({ ...parsed.data, ...(logoUrl !== undefined ? { logoUrl } : {}) });
  let extra = "";
  if (parsed.data.markup !== before.markup && bool(fd, "applyMarkup")) {
    const n = await recalculateAllPrices();
    extra = ` ${n} product price(s) recalculated with the new markup.`;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `Settings saved.${extra}` };
}

const methodSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,3})?$/, "Price like 8.00"),
  freeOver: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,3})?$/),
  ]),
  minDays: z.coerce.number().int().min(0).max(120),
  maxDays: z.coerce.number().int().min(0).max(120),
  position: z.coerce.number().int().min(0).max(1000),
});

export async function saveShippingMethodAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const { currency } = await getSettings();
  const parsed = methodSchema.safeParse({
    name: str(fd, "name"),
    description: str(fd, "description"),
    price: str(fd, "price") || "0",
    freeOver: str(fd, "freeOver"),
    minDays: str(fd, "minDays") || "0",
    maxDays: str(fd, "maxDays") || "0",
    position: str(fd, "position") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const data = {
    name: d.name,
    description: d.description,
    price: toMinor(d.price, currency),
    freeOver: d.freeOver ? toMinor(d.freeOver, currency) : null,
    minDays: d.minDays,
    maxDays: d.maxDays,
    position: d.position,
    active: bool(fd, "active"),
  };
  const id = str(fd, "id");
  if (id) await db.shippingMethod.update({ where: { id }, data });
  else await db.shippingMethod.create({ data });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Shipping method saved." };
}

export async function deleteShippingMethodAction(fd: FormData) {
  await requireAdmin();
  await db.shippingMethod.delete({ where: { id: str(fd, "id") } }).catch(() => undefined);
  revalidatePath("/admin/settings");
}
