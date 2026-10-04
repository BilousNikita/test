import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Creates a fresh, throwaway SQLite test database (prisma/test.db) before the test run. */
export default function setup() {
  for (const f of ["test.db", "test.db-journal"])
    fs.rmSync(path.join(__dirname, "..", "prisma", f), { force: true });
  execSync("npx prisma db push --skip-generate", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
