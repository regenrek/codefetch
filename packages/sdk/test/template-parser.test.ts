import { describe, it, expect } from "vitest";
import { processPromptTemplate, resolvePrompt } from "../src/template-parser";
import { writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "pathe";
import { tmpdir } from "node:os";

describe("template-parser", () => {
  describe("processPromptTemplate", () => {
    it("should replace CURRENT_CODEBASE placeholder", async () => {
      const template = "Review this:\n\n{{CURRENT_CODEBASE}}";
      const codebase = "const x = 1;";

      const result = await processPromptTemplate(template, codebase, {});

      expect(result).toBe("Review this:\n\nconst x = 1;");
    });

    it("should replace custom variables", async () => {
      const template = "Hello {{NAME}}, your project is {{PROJECT}}";
      const codebase = "";

      const result = await processPromptTemplate(template, codebase, {
        NAME: "World",
        PROJECT: "codefetch",
      });

      expect(result).toBe("Hello World, your project is codefetch");
    });

    it("should handle multiple occurrences of same variable", async () => {
      const template = "{{VAR}} and {{VAR}} again";

      const result = await processPromptTemplate(template, "", {
        VAR: "test",
      });

      expect(result).toBe("test and test again");
    });

    it("should handle template with no placeholders", async () => {
      const template = "Plain text without placeholders";

      const result = await processPromptTemplate(template, "code", {});

      expect(result).toBe("Plain text without placeholders");
    });
  });

  describe("resolvePrompt", () => {
    it("should resolve built-in fix prompt", async () => {
      const result = await resolvePrompt("fix");

      expect(result).toBeDefined();
      expect(result).toContain("{{CURRENT_CODEBASE}}");
    });

    it("should resolve built-in improve prompt", async () => {
      const result = await resolvePrompt("improve");

      expect(result).toBeDefined();
      expect(result).toContain("{{CURRENT_CODEBASE}}");
    });

    it("should resolve built-in codegen prompt", async () => {
      const result = await resolvePrompt("codegen");

      expect(result).toBeDefined();
      expect(result).toContain("{{CURRENT_CODEBASE}}");
    });

    it("should resolve built-in testgen prompt", async () => {
      const result = await resolvePrompt("testgen");

      expect(result).toBeDefined();
      expect(result).toContain("{{CURRENT_CODEBASE}}");
    });

    it("should return empty string for non-existent file", async () => {
      const result = await resolvePrompt("non-existent-file.md");

      expect(result).toBe("");
    });

    it("should read custom prompt file", async () => {
      const tempDir = join(tmpdir(), `codefetch-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
      const promptFile = join(tempDir, "custom.md");
      await writeFile(promptFile, "Custom prompt content");

      const result = await resolvePrompt(promptFile);

      expect(result).toBe("Custom prompt content");

      await rm(tempDir, { recursive: true, force: true });
    });

    it("should read .txt prompt files", async () => {
      const tempDir = join(tmpdir(), `codefetch-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
      const promptFile = join(tempDir, "prompt.txt");
      await writeFile(promptFile, "Text prompt content");

      const result = await resolvePrompt(promptFile);

      expect(result).toBe("Text prompt content");

      await rm(tempDir, { recursive: true, force: true });
    });

    it("should return undefined for unknown prompt type", async () => {
      const result = await resolvePrompt("unknown-type");

      expect(result).toBeUndefined();
    });
  });
});
