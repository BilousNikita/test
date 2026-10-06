#!/usr/bin/env node
// Rewrites the `provider` of the datasource in prisma/schema.prisma to match DATABASE_URL.
//   file:./dev.db              -> sqlite
//   postgres(ql)://user@host/db -> postgresql
// Can be forced with DATABASE_PROVIDER=sqlite|postgresql (useful at Docker build time).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath (not URL.pathname) so this also works on Windows (C:\...).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readDotEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env file */
  }
  return out;
}

const dotenv = { ...readDotEnv(path.join(root, ".env")), ...readDotEnv(path.join(root, ".env.local")) };
const url = process.env.DATABASE_URL ?? dotenv.DATABASE_URL ?? "";
let provider = process.env.DATABASE_PROVIDER ?? dotenv.DATABASE_PROVIDER ?? "";

if (!provider) {
  if (/^postgres(ql)?:\/\//i.test(url)) provider = "postgresql";
  else provider = "sqlite";
}
if (!["sqlite", "postgresql"].includes(provider)) {
  console.error(`[db] Unsupported DATABASE_PROVIDER "${provider}" (use sqlite or postgresql)`);
  process.exit(1);
}

const schemaPath = path.join(root, "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")([a-z]+)(")/s,
  (_m, a, _old, c) => `${a}${provider}${c}`,
);
if (next !== schema) {
  fs.writeFileSync(schemaPath, next);
  console.log(`[db] Prisma datasource provider set to "${provider}"`);
} else {
  console.log(`[db] Prisma datasource provider is "${provider}"`);
}
