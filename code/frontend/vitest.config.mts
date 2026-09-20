import path from "path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// .env.test (committed, dummy values) feeds every test file: values land in
// process.env only where not already set, so per-test overrides still win.
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const testEnv = loadEnv("test", rootDir, "");
for (const [key, value] of Object.entries(testEnv)) {
  if (process.env[key] === undefined && value !== undefined) {
    process.env[key] = value;
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
