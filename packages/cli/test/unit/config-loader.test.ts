import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";

const loadConfigMock = vi.hoisted(() => vi.fn());
const defaultConfig = {
  format: "markdown",
  outputPath: "out",
  outputFile: "SUMMARY.md",
  projectTree: 2,
  tokenEncoder: "cl100k",
  tokenLimiter: "truncated",
};

vi.mock("c12", () => ({
  loadConfig: loadConfigMock,
}));

const resolveConfigMock = vi.hoisted(() => vi.fn());
const mergeWithCliArgsMock = vi.hoisted(() => vi.fn());

vi.mock("codefetch-sdk", () => ({
  getDefaultConfig: vi.fn(() => defaultConfig),
  resolveCodefetchConfig: resolveConfigMock,
  createCustomConfigMerger: vi.fn(() => (a: any, b: any) => ({
    ...a,
    ...b,
  })),
  mergeWithCliArgs: mergeWithCliArgsMock,
}));

import { loadCodefetchConfig } from "../../src/config";

describe("loadCodefetchConfig", () => {
  it("merges overrides and resolves config", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "codefetch-config-"));

    loadConfigMock.mockResolvedValue({ config: defaultConfig });
    mergeWithCliArgsMock.mockImplementation((config, overrides) => ({
      ...config,
      ...overrides,
    }));
    resolveConfigMock.mockImplementation(async (config: any, cwd: string) => ({
      ...config,
      cwd,
    }));

    const config = await loadCodefetchConfig(tempDir, { format: "json" });

    expect(loadConfigMock).toHaveBeenCalled();
    expect(mergeWithCliArgsMock).toHaveBeenCalledWith(
      defaultConfig,
      expect.objectContaining({ format: "json" })
    );
    expect(config.format).toBe("json");
    expect((config as any).cwd).toBe(tempDir);

    await rm(tempDir, { recursive: true, force: true });
  });
});
