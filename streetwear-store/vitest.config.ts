import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: "file:./test.db",
      SITE_URL: "http://localhost:3000",
      CURRENCY: "USD",
      TAX_RATE: "0.17",
      PRICES_INCLUDE_TAX: "true",
      MAIL_TRANSPORT: "console",
      SESSION_SECRET: "test-secret-test-secret-test-secret",
    },
  },
});
