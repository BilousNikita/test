"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateTracking } from "@/lib/orders";
import { ORDER_STATUSES, SUPPLIER_ORDER_STATUSES } from "@/lib/validation";
import { bool, str, type ActionState } from "./form";

const id = z.string().min(1).max(64);

export async function updateOrderStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({ id, status: z.enum(ORDER_STATUSES), adminNotes: z.string().max(5000) })
    .safeParse({ id: str(fd, "id"), status: str(fd, "status"), adminNotes: str(fd, "adminNotes") });
  if (!parsed.success) return { error: "Invalid status." };
  await db.order.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status, adminNotes: parsed.data.adminNotes || null },
  });
  revalidatePath(`/admin/orders/${parsed.data.id}`);
  return { ok: true, message: "Order updated." };
}

export async function updateTrackingAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      id,
      trackingNumber: z.string().trim().max(100),
      trackingCarrier: z.string().trim().max(60),
      trackingUrl: z.union([z.literal(""), z.string().trim().url().max(500)]),
    })
    .safeParse({
      id: str(fd, "id"),
      trackingNumber: str(fd, "trackingNumber"),
      trackingCarrier: str(fd, "trackingCarrier"),
      trackingUrl: str(fd, "trackingUrl"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { emailed } = await updateTracking(parsed.data.id, { ...parsed.data, notify: bool(fd, "notify") });
  revalidatePath(`/admin/orders/${parsed.data.id}`);
  return { ok: true, message: emailed ? "Tracking saved and customer emailed." : "Tracking saved." };
}

export async function refundNoteAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({ id, refundNote: z.string().trim().max(2000) })
    .safeParse({ id: str(fd, "id"), refundNote: str(fd, "refundNote") });
  if (!parsed.success) return { error: "Invalid note." };
  await db.order.update({
    where: { id: parsed.data.id },
    data: {
      refundNote: parsed.data.refundNote || null,
      ...(bool(fd, "markRefunded") ? { status: "refunded" } : {}),
    },
  });
  revalidatePath(`/admin/orders/${parsed.data.id}`);
  return {
    ok: true,
    message: bool(fd, "markRefunded")
      ? "Marked as refunded. Remember to issue the actual refund in your Stripe dashboard."
      : "Refund note saved.",
  };
}

export async function updateSupplierOrderAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      id,
      status: z.enum(SUPPLIER_ORDER_STATUSES),
      supplierOrderRef: z.string().trim().max(100),
      trackingNumber: z.string().trim().max(100),
      notes: z.string().trim().max(2000),
    })
    .safeParse({
      id: str(fd, "id"),
      status: str(fd, "status"),
      supplierOrderRef: str(fd, "supplierOrderRef"),
      trackingNumber: str(fd, "trackingNumber"),
      notes: str(fd, "notes"),
    });
  if (!parsed.success) return { error: "Invalid supplier order data." };
  const { id: soId, ...data } = parsed.data;
  const so = await db.supplierOrder.update({
    where: { id: soId },
    data: {
      status: data.status,
      supplierOrderRef: data.supplierOrderRef || null,
      trackingNumber: data.trackingNumber || null,
      notes: data.notes || null,
    },
  });
  // Convenience: copy the supplier's tracking to the customer order and email the customer.
  let msg = "Supplier order updated.";
  if (data.trackingNumber && bool(fd, "copyTracking")) {
    const { emailed } = await updateTracking(so.orderId, {
      trackingNumber: data.trackingNumber,
      notify: true,
    });
    msg += emailed ? " Tracking copied to order and customer emailed." : " Tracking copied to order.";
  }
  revalidatePath(`/admin/orders/${so.orderId}`);
  revalidatePath("/admin/supplier-orders");
  return { ok: true, message: msg };
}
