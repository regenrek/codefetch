import { describe, it, expect } from "vitest";
import fixPrompt from "../../src/prompts/fix";
import improvePrompt from "../../src/prompts/improve";
import codegenPrompt from "../../src/prompts/codegen";
import testgenPrompt from "../../src/prompts/testgen";

describe("CLI prompts", () => {
  it("should export fix prompt template", () => {
    expect(fixPrompt).toBeDefined();
    expect(typeof fixPrompt).toBe("string");
    expect(fixPrompt).toContain("{{CURRENT_CODEBASE}}");
  });

  it("should export improve prompt template", () => {
    expect(improvePrompt).toBeDefined();
    expect(typeof improvePrompt).toBe("string");
    expect(improvePrompt).toContain("{{CURRENT_CODEBASE}}");
  });

  it("should export codegen prompt template", () => {
    expect(codegenPrompt).toBeDefined();
    expect(typeof codegenPrompt).toBe("string");
    expect(codegenPrompt).toContain("{{CURRENT_CODEBASE}}");
  });

  it("should export testgen prompt template", () => {
    expect(testgenPrompt).toBeDefined();
    expect(typeof testgenPrompt).toBe("string");
    expect(testgenPrompt).toContain("{{CURRENT_CODEBASE}}");
  });

  it("fix prompt should contain fix-related instructions", () => {
    expect(fixPrompt.toLowerCase()).toContain("fix");
  });

  it("improve prompt should contain improvement instructions", () => {
    expect(improvePrompt.toLowerCase()).toContain("improve");
  });

  it("codegen prompt should contain code generation instructions", () => {
    expect(codegenPrompt.toLowerCase()).toContain("code");
  });

  it("testgen prompt should contain test generation instructions", () => {
    expect(testgenPrompt.toLowerCase()).toContain("test");
  });
});
