import { defineConfig } from "vitest/config";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env");
} catch {
  /* CI supplies env. */
}
export default defineConfig({
  test: { testTimeout: 15000, hookTimeout: 30000, fileParallelism: false },
});
