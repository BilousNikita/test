"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveImage } from "@/lib/storage";
import { slugify, slugSchema } from "@/lib/validation";
import { bool, files, str, type ActionState } from "./form";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(80),
  slug: slugSchema,
  description: z.string().trim().max(1000),
  position: z.coerce.number().int().min(0).max(10000),
});

function parse(fd: FormData) {
  return schema.safeParse({
    name: str(fd, "name"),
    slug: str(fd, "slug") || slugify(str(fd, "name")),
    description: str(fd, "description"),
    position: str(fd, "position") || "0",
  });
}

function dupError(err: unknown): ActionState {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
    return { error: "That slug is already in use." };
  console.error(err);
  return { error: "Could not save." };
}

async function maybeImage(fd: FormData) {
  const f = files(fd, "image")[0];
  return f ? saveImage(Buffer.from(await f.arrayBuffer()), "collections") : undefined;
}

export async function saveCategoryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const id = str(fd, "id");
  try {
    if (id) await db.category.update({ where: { id }, data: { ...parsed.data, isPlaceholder: false } });
    else await db.category.create({ data: parsed.data });
  } catch (err) {
    return dupError(err);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function deleteCategoryAction(fd: FormData) {
  await requireAdmin();
  await db.category.delete({ where: { id: str(fd, "id") } }).catch(() => undefined);
  revalidatePath("/", "layout");
}

export async function saveCollectionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parse(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const id = str(fd, "id");
  try {
    const imageUrl = await maybeImage(fd);
    const data = { ...parsed.data, featured: bool(fd, "featured"), ...(imageUrl ? { imageUrl } : {}) };
    if (id) await db.collection.update({ where: { id }, data: { ...data, isPlaceholder: false } });
    else await db.collection.create({ data });
  } catch (err) {
    if (err instanceof Error && !(err instanceof Prisma.PrismaClientKnownRequestError))
      return { error: err.message };
    return dupError(err);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function deleteCollectionAction(fd: FormData) {
  await requireAdmin();
  await db.collection.delete({ where: { id: str(fd, "id") } }).catch(() => undefined);
  revalidatePath("/", "layout");
}
