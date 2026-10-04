"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, hashPassword, requireAdmin, verifyCredentials } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";
import type { ActionState } from "./form";

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ip = clientIp(await headers());
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };

  const ipLimit = rateLimit(`login-ip:${ip}`, 10, 15 * 60_000);
  const userLimit = rateLimit(`login-user:${parsed.data.email}`, 5, 15 * 60_000);
  if (!ipLimit.ok || !userLimit.ok) {
    const wait = Math.max(ipLimit.retryAfterSec, userLimit.retryAfterSec);
    return { error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` };
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) return { error: "Invalid email or password." };

  resetRateLimit(`login-user:${parsed.data.email}`);
  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

const pwSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(12, "Use at least 12 characters").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = pwSchema.safeParse({
    current: fd.get("current"),
    next: fd.get("next"),
    confirm: fd.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const user = await db.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash)))
    return { error: "Current password is wrong." };
  await db.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(parsed.data.next) },
  });
  return { ok: true, message: "Password updated." };
}
