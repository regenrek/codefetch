import { describe, test, expect } from "vitest";
import { fetch } from "../src/index";
import { FetchResultImpl } from "../src/fetch-result";

describe("GitHub Repository Demo", () => {
  test("fetch sindresorhus/is-plain-obj repository", async () => {
    console.log(
      "\n🔍 Fetching https://github.com/sindresorhus/is-plain-obj...\n"
    );

    // Fetch as JSON
    const result = (await fetch({
      source: "https://github.com/sindresorhus/is-plain-obj",
      format: "json",
    })) as FetchResultImpl;

    // Display metadata
    console.log("📊 Repository Metadata:");
    console.log(`   Total Files: ${result.metadata.totalFiles}`);
    console.log(
      `   Total Size: ${(result.metadata.totalSize / 1024).toFixed(2)} KB`
    );
    console.log(`   Total Tokens: ${result.metadata.totalTokens}`);
    console.log(`   Source: ${result.metadata.source}`);
    console.log(`   Fetched At: ${result.metadata.fetchedAt.toISOString()}\n`);

    // List all files
    console.log("📁 Files in repository:");
    const allFiles = result.getAllFiles();
    for (const file of allFiles) {
      console.log(
        `   - ${file.path} (${file.size} bytes, ${file.tokens} tokens)`
      );
    }

    // Show main file content
    const indexFile = result.getFileByPath("index.js");
    if (indexFile?.content) {
      console.log("\n📄 Content of index.js:");
      console.log("─".repeat(50));
      console.log(indexFile.content);
      console.log("─".repeat(50));
    }

    // Assertions
    expect(result).toBeDefined();
    expect(result.metadata.totalFiles).toBeGreaterThan(0);
    expect(allFiles.some((f) => f.name === "index.js")).toBe(true);
    expect(allFiles.some((f) => f.name === "package.json")).toBe(true);
  }, 30_000);

  test("generate markdown for sindresorhus/is-plain-obj", async () => {
    console.log("\n📝 Generating markdown for the repository...\n");

    const markdown = (await fetch({
      source: "https://github.com/sindresorhus/is-plain-obj",
      format: "markdown",
      projectTree: 2,
      maxTokens: 5000,
    })) as string;

    console.log("📄 Generated Markdown (first 1000 characters):");
    console.log("─".repeat(50));
    console.log(markdown.slice(0, 1000));
    console.log("...");
    console.log("─".repeat(50));
    console.log(`\nTotal markdown length: ${markdown.length} characters`);

    // Assertions
    expect(markdown).toBeDefined();
    expect(markdown).toContain("Project Structure:");
    expect(markdown).toContain("index.js");
    expect(markdown).toContain("export default function isPlainObject");
  }, 30_000);

  test("fetch with filtering options", async () => {
    console.log(
      "\n🎯 Fetching with filters (only .js files, exclude tests)...\n"
    );

    const result = (await fetch({
      source: "https://github.com/sindresorhus/is-plain-obj",
      format: "json",
      extensions: [".js"],
      excludeFiles: ["test.js", "*.test.js", "benchmark.js"],
    })) as FetchResultImpl;

    const allFiles = result.getAllFiles();
    console.log("📁 Filtered files:");
    for (const file of allFiles) {
      console.log(`   - ${file.path}`);
    }

    // Assertions
    expect(allFiles.every((f) => f.name.endsWith(".js"))).toBe(true);
    expect(allFiles.some((f) => f.name === "test.js")).toBe(false);
    expect(allFiles.some((f) => f.name === "benchmark.js")).toBe(false);
    expect(allFiles.some((f) => f.name === "index.js")).toBe(true);
  }, 30_000);
});
