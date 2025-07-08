import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "dist-worker/**",
        "test/**",
        "examples/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "build.*.config.ts",
        "vitest.config.ts",
      ],
      include: ["src/**/*.ts"],
      all: true,
      thresholds: {
        lines: 35,
        functions: 35,
        branches: 35,
        statements: 35,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
