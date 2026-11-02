import { defineConfig } from "vitest/config";

// Needs a real Postgres: set DATABASE_URL (docker compose or a CI service container).
export default defineConfig({
  test: {
    include: ["../tests/integration/**/*.test.ts"],
    globalSetup: ["../tests/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
