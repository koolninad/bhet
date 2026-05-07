import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
  },
  webServer: [
    {
      command: "cd apps/server && pnpm dev",
      port: 3100,
      reuseExistingServer: true,
    },
    {
      command: "cd apps/web && pnpm dev",
      port: 3001,
      reuseExistingServer: true,
    },
  ],
});
