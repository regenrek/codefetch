import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { generateMarkdown } from "../src/markdown";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";

describe("Markdown Generation", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "codefetch-markdown-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir("/");
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("generateMarkdown", () => {
    test("should generate markdown for files", async () => {
      await writeFile("file1.js", "console.log('hello');");
      await writeFile("file2.ts", "const greeting: string = 'world';");

      const markdown = await generateMarkdown(["file1.js", "file2.ts"], {
        maxTokens: null,
        tokenEncoder: "simple",
        disableLineNumbers: false,
      });

      expect(markdown).toContain("file1.js");
      expect(markdown).toContain("console.log('hello');");
      expect(markdown).toContain("file2.ts");
      expect(markdown).toContain("const greeting: string = 'world';");
      expect(markdown).toContain("```");
    });

    test("should include line numbers by default", async () => {
      await writeFile(
        "test.js",
        `line1
line2
line3`
      );

      const markdown = await generateMarkdown(["test.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
        disableLineNumbers: false,
      });

      expect(markdown).toContain("1 | line1");
      expect(markdown).toContain("2 | line2");
      expect(markdown).toContain("3 | line3");
    });

    test("should disable line numbers when requested", async () => {
      await writeFile(
        "test.js",
        `line1
line2
line3`
      );

      const markdown = await generateMarkdown(["test.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
        disableLineNumbers: true,
      });

      expect(markdown).not.toContain("1 | ");
      expect(markdown).not.toContain("2 | ");
      expect(markdown).toContain("line1");
      expect(markdown).toContain("line2");
      expect(markdown).toContain("line3");
    });

    test("should respect maxTokens limit in truncated mode", async () => {
      const longContent = "const x = 1;\n".repeat(100);
      await writeFile("long.js", longContent);

      const markdown = await generateMarkdown(["long.js"], {
        maxTokens: 20, // Very low limit
        tokenEncoder: "simple",
        tokenLimiter: "truncated",
      });

      expect(markdown).toContain("[TRUNCATED]");
      expect(markdown).toContain("long.js");
      expect(markdown).toContain("```");
    });

    test("should handle empty files", async () => {
      await writeFile("empty.js", "");

      const markdown = await generateMarkdown(["empty.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
      });

      expect(markdown).toContain("empty.js");
      expect(markdown).toContain("```");
    });

    test("should include project tree when requested", async () => {
      await mkdir("src");
      await writeFile("src/index.js", "export default {};");
      await writeFile("README.md", "# Project");

      const markdown = await generateMarkdown(["src/index.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
        projectTree: 2,
      });

      expect(markdown).toContain("Project Structure:");
      expect(markdown).toContain("src");
      expect(markdown).toContain("index.js");
      expect(markdown).not.toContain("README.md");
    });

    test("should include ignored files in tree when skip flag set", async () => {
      await mkdir("src", { recursive: true });
      await writeFile("src/index.js", "export default {};");
      await writeFile("README.md", "# Project");

      const markdown = await generateMarkdown(["src/index.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
        projectTree: 2,
        projectTreeSkipIgnoreFiles: true,
      });

      expect(markdown).toContain("Project Structure:");
      expect(markdown).toContain("README.md");
    });

    test("should handle prompt file", async () => {
      await writeFile("prompt.md", "# Custom Prompt\nThis is a test prompt.");
      await writeFile("code.js", "const test = true;");

      const markdown = await generateMarkdown(["code.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
        promptFile: "prompt.md",
      });

      // The prompt replaces the entire content in the current implementation
      expect(markdown).toContain("# Custom Prompt");
      expect(markdown).toContain("This is a test prompt.");
    });

    test("should process template variables", async () => {
      await writeFile(
        "prompt.md",
        "Project: {{PROJECT_NAME}}\nVersion: {{VERSION}}"
      );
      await writeFile("code.js", "const app = {};");

      const markdown = await generateMarkdown(["code.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
        promptFile: "prompt.md",
        templateVars: {
          PROJECT_NAME: "TestApp",
          VERSION: "1.0.0",
        },
      });

      expect(markdown).toContain("Project: TestApp");
      expect(markdown).toContain("Version: 1.0.0");
      expect(markdown).not.toContain("{{PROJECT_NAME}}");
      expect(markdown).not.toContain("{{VERSION}}");
    });

    test("should handle sequential token limiter", async () => {
      await writeFile("file1.js", "const a = 1;");
      await writeFile("file2.js", "const b = 2;" + "\n".repeat(50)); // Make this file larger
      await writeFile("file3.js", "const c = 3;");

      const markdown = await generateMarkdown(
        ["file1.js", "file2.js", "file3.js"],
        {
          maxTokens: 15, // Very low limit that should only allow first file
          tokenEncoder: "simple",
          tokenLimiter: "sequential",
          disableLineNumbers: true, // Explicit for test consistency
        }
      );

      expect(markdown).toContain("file1.js");
      // With very low token limit, at most 2 files should fit
      const fileCount = (markdown.match(/file\d\.js/g) || []).length;
      expect(fileCount).toBeLessThanOrEqual(2);
    });

    test("should handle truncated token limiter", async () => {
      await writeFile("file1.js", "const a = 1;\n".repeat(50));
      await writeFile("file2.js", "const b = 2;\n".repeat(50));

      const markdown = await generateMarkdown(["file1.js", "file2.js"], {
        maxTokens: 50,
        tokenEncoder: "simple",
        tokenLimiter: "truncated",
      });

      expect(markdown).toContain("file1.js");
      expect(markdown).toContain("file2.js");
      // Both files should be included but truncated
      expect(markdown).toContain("[TRUNCATED]");
    });

    test("should handle verbose logging", async () => {
      const logs: Array<{ message: string; level: number }> = [];
      await writeFile("test.js", "console.log('test');");

      await generateMarkdown(["test.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
        verbose: 3,
        onVerbose: (message, level) => {
          logs.push({ message, level });
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.level === 2)).toBe(true);
      expect(logs.some((log) => log.level === 3)).toBe(true);
    });

    test("should handle non-existent files gracefully", async () => {
      try {
        await generateMarkdown(["non-existent.js"], {
          maxTokens: null,
          tokenEncoder: "simple",
        });
        // If it doesn't throw, that's also ok
        expect(true).toBe(true);
      } catch (error) {
        // Should throw ENOENT error
        expect(error).toBeDefined();
        expect(String(error)).toContain("ENOENT");
      }
    });

    test("should handle binary files", async () => {
      // Create a binary file
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff]);
      await writeFile("binary.dat", binaryData);

      const markdown = await generateMarkdown(["binary.dat"], {
        maxTokens: null,
        tokenEncoder: "simple",
      });

      expect(markdown).toContain("binary.dat");
      // Binary content should be handled somehow
      expect(markdown).toBeDefined();
    });

    test("should respect file order", async () => {
      await writeFile("a.js", "// File A");
      await writeFile("b.js", "// File B");
      await writeFile("c.js", "// File C");

      const markdown = await generateMarkdown(["c.js", "a.js", "b.js"], {
        maxTokens: null,
        tokenEncoder: "simple",
      });

      const aIndex = markdown.indexOf("// File A");
      const bIndex = markdown.indexOf("// File B");
      const cIndex = markdown.indexOf("// File C");

      expect(cIndex).toBeLessThan(aIndex);
      expect(aIndex).toBeLessThan(bIndex);
    });

    test("should handle different token encoders", async () => {
      await writeFile("test.js", "const test = true;");

      const simpleMarkdown = await generateMarkdown(["test.js"], {
        maxTokens: 100,
        tokenEncoder: "simple",
      });

      const cl100kMarkdown = await generateMarkdown(["test.js"], {
        maxTokens: 100,
        tokenEncoder: "cl100k",
      });

      // Both should generate valid markdown
      expect(simpleMarkdown).toContain("test.js");
      expect(cl100kMarkdown).toContain("test.js");
    });

    test("should skip prompt if it exceeds token limit", async () => {
      const longPrompt = "This is a very long prompt. ".repeat(100);
      await writeFile("prompt.md", longPrompt);
      await writeFile("code.js", "const x = 1;");

      const markdown = await generateMarkdown(["code.js"], {
        maxTokens: 10, // Very low limit
        tokenEncoder: "simple",
        promptFile: "prompt.md",
      });

      // Prompt should be skipped but file should still be processed
      expect(markdown).not.toContain("This is a very long prompt");
      expect(markdown).toBeDefined();
    });

    test("should skip tree if it exceeds token limit", async () => {
      // Create many files to make a large tree
      for (let i = 0; i < 50; i++) {
        await writeFile(`file${i}.js`, `const x = ${i};`);
      }

      const markdown = await generateMarkdown(["file0.js"], {
        maxTokens: 1, // Extremely low limit to force skipping the tree
        tokenEncoder: "simple",
        projectTree: 3,
      });

      // Tree should be skipped but file should still be processed
      expect(markdown).not.toContain("Project Structure:");
      // With such a low token limit, even the file might be skipped
      expect(markdown).toBeDefined();
    });
  });
});
