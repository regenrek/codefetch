import { resolve } from "pathe";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { VALID_PROMPTS } from "./constants";

// Update the PromptModule type to match the actual structure
type PromptModule = {
  default: string;
};

const builtInPrompts: Record<string, () => Promise<PromptModule>> = {
  fix: () => import("./prompts/fix"),
  improve: () => import("./prompts/improve"),
  codegen: () => import("./prompts/codegen"),
  testgen: () => import("./prompts/testgen"),
};

export async function processPromptTemplate(
  template: string,
  codebase: string,
  vars: Record<string, string>
): Promise<string> {
  let result = template;

  // Process all other variables
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  // Replace CURRENT_CODEBASE placeholder with codebase content
  result = result.replace(/{{CURRENT_CODEBASE}}/g, codebase);

  return result;
}

/**
 * Check if a template contains the CURRENT_CODEBASE placeholder
 */
export function hasCodebasePlaceholder(template: string): boolean {
  return template.includes("{{CURRENT_CODEBASE}}");
}

export async function resolvePrompt(
  promptFile: string
): Promise<string | undefined> {
  // Check built-in prompts
  if (VALID_PROMPTS.has(promptFile)) {
    try {
      const mod = await builtInPrompts[promptFile]?.();
      return mod?.default; // Now just return the string
    } catch {
      console.error(`Built-in prompt "${promptFile}" not found`);
      return "";
    }
  }

  if (promptFile.endsWith(".md") || promptFile.endsWith(".txt")) {
    const defaultPath = resolve(promptFile);
    if (!existsSync(defaultPath)) {
      return "";
    }
    return await readFile(defaultPath, "utf8");
  }
}
