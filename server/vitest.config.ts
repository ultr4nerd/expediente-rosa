import { defineConfig } from "vitest/config";

// Integration tests need a real Valkey (docker compose -f compose.yaml up valkey).
// Named *.itest.ts so the root `pnpm test` never picks them up.
export default defineConfig({
  test: { include: ["test/**/*.itest.ts"], fileParallelism: false },
});
