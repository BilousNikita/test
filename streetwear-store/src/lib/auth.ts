import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { env, isHttps } from "./env";

export const ADMIN_COOKIE = "sa_admin";
const SESSION_DAYS = 7;

/** Session ids are stored as HMAC(token) so a DB leak does not leak usable cookies. */
function hashToken(token: string) {
  return crypto.createHmac("sha256", env().SESSION_SECRET).update(token).digest("hex");
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

/** Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet. */
export async function ensureAdminFromEnv() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = env();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  const count = await db.adminUser.count();
  if (count > 0) return;
  await db.adminUser.create({
    data: { email: ADMIN_EMAIL.toLowerCase(), passwordHash: await hashPassword(ADMIN_PASSWORD) },
  });
  console.log(`[auth] Created first admin user ${ADMIN_EMAIL}`);
}

// Used to keep timing similar when the user does not exist.
const DUMMY_HASH = "$2b$12$PQxJ7IlGixylSo0w7YDV7uSm3J6mD6Re7vsDjzS9BQcsqvIKlj/aW";

export async function verifyCredentials(email: string, password: string) {
  await ensureAdminFromEnv();
  const user = await db.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  return ok && user ? user : null;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.adminSession.create({ data: { id: hashToken(token), userId, expiresAt } });
  // opportunistic cleanup
  await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(ADMIN_COOKIE);
}

export async function getAdmin() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** Use at the top of every admin page, server action and admin API route. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
