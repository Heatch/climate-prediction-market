import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    environment: "node",
    include: ["tests/climate-market.ts"],
    fileParallelism: false,
    isolate: false,
    hookTimeout: 60_000,
    testTimeout: 1_000_000,
  },
})
