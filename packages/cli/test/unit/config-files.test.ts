import { describe, it, expect } from "vitest";

describe("configuration files", () => {
  it("load build and vitest configs", async () => {
    const buildConfig = await import("../../build.config");
    const vitestConfig = await import("../../vitest.config");
    // @ts-expect-error config file is plain JS
    const codefetchConfig = await import("../../codefetch.config.mjs");

    expect(buildConfig.default).toBeDefined();
    expect(vitestConfig.default).toBeDefined();
    expect(codefetchConfig.default).toBeDefined();
  });
});
