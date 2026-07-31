import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    // mongodb-memory-server downloads a binary on first run.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // One in-memory server per file keeps state isolated.
    fileParallelism: false,
  },
});
