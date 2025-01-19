import { resolve } from "pathe";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { RESERVED_PROMPTS } from "./constants";

const builtInPrompts: Record<string, () => Promise<PromptModule>> = {
  fix: () => import("./prompts/fix"),
  improve: () => import("./prompts/improve"),
  codegen: () => import("./prompts/codegen"),
  testgen: () => import("./prompts/testgen"),
};

async function processPromptTemplate(
  template: string,
  codebase: string,
  vars: Record<string, string>
): Promise<string> {
  let result = template;

  // Always process CURRENT_CODEBASE first
  result = result.replace(/{{CURRENT_CODEBASE}}/g, codebase);

  // Process all other variables
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  return result;
}

export async function replaceTemplateVars(
  cwd: string,
  codebase: string,
  outputPath: string,
  promptFile: string,
  templateVars: Record<string, string> = {}
): Promise<string> {
  const promptTemplate = await resolvePrompt(outputPath, promptFile, cwd);

  console.log("PROMPT TEMPLATE", promptTemplate);

  return promptTemplate
    ? processPromptTemplate(promptTemplate, codebase, templateVars)
    : codebase;
}

// Update the PromptModule type to match the actual structure
type PromptModule = {
  default: string;
};

async function resolvePrompt(
  outputPath: string,
  promptFile: string,
  cwd: string
): Promise<string | undefined> {
  // Check for default prompt when only -p is used
  if (promptFile === "default") {
    const defaultPath = resolve(outputPath, "prompts/default.md");
    if (existsSync(defaultPath)) {
      return await readFile(defaultPath, "utf8");
    }
  }

  // Check built-in prompts
  if (RESERVED_PROMPTS.has(promptFile)) {
    try {
      const mod = await builtInPrompts[promptFile]?.();
      return mod?.default; // Now just return the string
    } catch {
      console.error(`Built-in prompt "${promptFile}" not found`);
      return "";
    }
  }

  // Check for custom prompts in codefetch/prompts
  if (promptFile.endsWith(".md") || promptFile.endsWith(".txt")) {
    const customPath = resolve(cwd, "codefetch/prompts", promptFile);
    if (existsSync(customPath)) {
      return await readFile(customPath, "utf8");
    }
    console.error(`Custom prompt file not found: ${promptFile}`);
    return "";
  }

  return "";
}
