import { describe, test, expect } from "vitest";
import * as browserExports from "../src/browser";

describe("Browser Exports", () => {
  test("should export all required browser-safe items", () => {
    // Classes and functions
    expect(browserExports.FetchResultImpl).toBeDefined();
    expect(browserExports.countTokens).toBeDefined();
    expect(browserExports.generateMarkdownFromContent).toBeDefined();
    expect(browserExports.detectLanguage).toBeDefined();

    // Constants
    expect(browserExports.SUPPORTED_MODELS).toBeDefined();
    expect(browserExports.VALID_PROMPTS).toBeDefined();
    expect(browserExports.VALID_ENCODERS).toBeDefined();
    expect(browserExports.VALID_LIMITERS).toBeDefined();

    // Prompts
    expect(browserExports.prompts).toBeDefined();
    expect(browserExports.prompts.codegen).toBeDefined();
    expect(browserExports.prompts.fix).toBeDefined();
    expect(browserExports.prompts.improve).toBeDefined();
    expect(browserExports.prompts.testgen).toBeDefined();
    expect(browserExports.codegenPrompt).toBeDefined();
    expect(browserExports.fixPrompt).toBeDefined();
    expect(browserExports.improvePrompt).toBeDefined();
    expect(browserExports.testgenPrompt).toBeDefined();
  });

  test("should not export Node.js dependent functions", () => {
    // These should NOT be exported in browser build
    expect((browserExports as any).generateMarkdown).toBeUndefined();
    expect((browserExports as any).generateProjectTree).toBeUndefined();
    expect((browserExports as any).collectFilesAsTree).toBeUndefined();
    expect((browserExports as any).findProjectRoot).toBeUndefined();
    expect((browserExports as any).fetchFromWeb).toBeUndefined();
    expect((browserExports as any).GitHubApiClient).toBeUndefined();
  });

  test("FetchResultImpl should work with browser-safe data", () => {
    const fileNode = {
      name: "test.js",
      path: "test.js",
      type: "file" as const,
      content: "console.log('hello');",
    };

    const metadata = {
      fetchedAt: new Date(),
      source: "https://example.com",
      totalFiles: 1,
      totalSize: 21,
      totalTokens: 5,
    };

    const result = new browserExports.FetchResultImpl(fileNode, metadata);

    expect(result.root).toEqual(fileNode);
    expect(result.metadata).toEqual(metadata);
    expect(result.getAllFiles()).toHaveLength(1);
    expect(result.toMarkdown()).toContain("console.log('hello');");
  });

  test("countTokens should work in browser context", async () => {
    const text = "Hello, world!";
    const tokenCount = await browserExports.countTokens(text, "simple");
    expect(tokenCount).toBeGreaterThan(0);
  });

  test("detectLanguage should work correctly", () => {
    expect(browserExports.detectLanguage("test.js")).toBe("javascript");
    expect(browserExports.detectLanguage("style.css")).toBe("css");
    expect(browserExports.detectLanguage("README.md")).toBe("markdown");
    expect(browserExports.detectLanguage("unknown.xyz")).toBe("text");
  });
});
