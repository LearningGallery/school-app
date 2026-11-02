import { defineConfig } from "@playwright/test";

// Runs against a deployed stack (compose or staging): E2E_BASE_URL defaults to the compose frontend.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8081",
    trace: "retain-on-failure",
  },
});
