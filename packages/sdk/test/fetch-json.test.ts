import { describe, it, expect } from "vitest";
import { fetch } from "../src/fetch";
import { FetchResultImpl } from "../src/fetch-result";
import { join } from "pathe";

describe("fetch with JSON format", () => {
  const fixturesDir = join(__dirname, "fixtures", "sample-project");

  it("should return FetchResult when format is json", async () => {
    const result = await fetch({
      source: fixturesDir,
      format: "json",
      extensions: [".js", ".json"],
    });

    expect(result).toBeInstanceOf(FetchResultImpl);

    if (result instanceof FetchResultImpl) {
      expect(result.root).toBeDefined();
      expect(result.root.type).toBe("directory");
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalFiles).toBeGreaterThan(0);
    }
  });

  it("should return markdown string when format is markdown", async () => {
    const result = await fetch({
      source: fixturesDir,
      format: "markdown",
      extensions: [".js", ".json"],
    });

    expect(typeof result).toBe("string");
    expect(result).toContain("Project Structure:");
  });

  it("should access files by path", async () => {
    const result = await fetch({
      source: fixturesDir,
      format: "json",
      extensions: [".js", ".json"],
    });

    if (result instanceof FetchResultImpl) {
      const packageJson = result.getFileByPath("package.json");
      expect(packageJson).toBeDefined();
      expect(packageJson?.type).toBe("file");
      expect(packageJson?.content).toBeDefined();
    }
  });

  it("should get all files as flat array", async () => {
    const result = await fetch({
      source: fixturesDir,
      format: "json",
      extensions: [".js", ".json"],
    });

    if (result instanceof FetchResultImpl) {
      const allFiles = result.getAllFiles();
      expect(Array.isArray(allFiles)).toBe(true);
      expect(allFiles.length).toBeGreaterThan(0);
      expect(allFiles.every((f) => f.type === "file")).toBe(true);
    }
  });

  it("should convert FetchResult to markdown", async () => {
    const result = await fetch({
      source: fixturesDir,
      format: "json",
      extensions: [".js", ".json"],
    });

    if (result instanceof FetchResultImpl) {
      const markdown = result.toMarkdown();
      expect(typeof markdown).toBe("string");
      expect(markdown).toContain("Project Structure:");
      expect(markdown).toContain("package.json");
    }
  });
});
