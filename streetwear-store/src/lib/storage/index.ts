import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "../env";

/**
 * File storage abstraction. Default: local disk (UPLOAD_DIR, a Docker volume in production),
 * served by the /uploads/[...path] route. To move to S3/R2/Spaces, implement `S3Storage`
 * (see the stub below) and set STORAGE_DRIVER=s3 – the rest of the app only uses `getStorage()`.
 */
export interface Storage {
  /** Saves a file and returns its public URL (e.g. "/uploads/products/abc.webp"). */
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  delete(url: string): Promise<void>;
}

export function uploadRoot() {
  return path.resolve(process.cwd(), env().UPLOAD_DIR);
}

class LocalStorage implements Storage {
  async put(key: string, data: Buffer) {
    const safeKey = key.replace(/[^a-zA-Z0-9/_.-]/g, "").replace(/\.\.+/g, ".");
    const full = path.join(uploadRoot(), safeKey);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return `/uploads/${safeKey}`;
  }

  async delete(url: string) {
    if (!url.startsWith("/uploads/")) return;
    const full = path.resolve(uploadRoot(), url.slice("/uploads/".length));
    if (!full.startsWith(uploadRoot() + path.sep)) return;
    await fs.rm(full, { force: true });
  }
}

/**
 * S3-compatible storage stub. To enable:
 *  1. npm i @aws-sdk/client-s3
 *  2. implement put() with PutObjectCommand (Bucket=S3_BUCKET, Key=key, Body=data, ContentType)
 *     and return `${S3_PUBLIC_URL}/${key}`; implement delete() with DeleteObjectCommand.
 *  3. add the S3 public hostname to `images.remotePatterns` in next.config.ts and to `img-src` in the CSP.
 *  4. set STORAGE_DRIVER=s3 and S3_* variables.
 */
class S3Storage implements Storage {
  async put(): Promise<string> {
    throw new Error("S3 storage is not configured yet – see src/lib/storage/index.ts");
  }
  async delete() {
    throw new Error("S3 storage is not configured yet – see src/lib/storage/index.ts");
  }
}

let storage: Storage | null = null;
export function getStorage(): Storage {
  if (!storage) storage = env().STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
  return storage;
}

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "gif", "tiff"]);

/**
 * Validates an uploaded image by decoding it (not by trusting the extension/MIME type),
 * strips metadata, limits the size to 2000px and stores it as WebP.
 */
export async function saveImage(data: Buffer, folder: string): Promise<string> {
  const maxBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  if (data.byteLength > maxBytes) throw new Error(`Image is larger than ${env().MAX_UPLOAD_MB} MB`);
  let meta: sharp.Metadata;
  try {
    meta = await sharp(data).metadata();
  } catch {
    throw new Error("File is not a valid image");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new Error("Unsupported image format");
  const out = await sharp(data)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.webp`;
  return getStorage().put(`${folder}/${name}`, out, "image/webp");
}

/** Downloads a remote image (e.g. a supplier CDN URL from a CSV) and stores it locally. */
export async function importRemoteImage(url: string, folder: string): Promise<string> {
  const u = new URL(url);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Invalid image URL");
  const res = await fetch(u, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  return saveImage(Buffer.from(await res.arrayBuffer()), folder);
}
