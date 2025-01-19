import { resolve } from "pathe";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const RESERVED_PROMPTS = new Set([
  "default",
  "fix",
  "improve",
  "testgen",
  "codegen",
]);

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

async function getPromptTemplate(prompt: string): Promise<string | null> {
  // Handle built-in prompts
  if (RESERVED_PROMPTS.has(prompt)) {
    const { PROMPT } = await import(`./prompts/${prompt}.ts`);
    return PROMPT;
  }

  // Handle custom prompt files
  const promptPath = resolve(
    process.cwd(),
    "codefetch/prompts",
    prompt === "default" ? "default.md" : prompt
  );

  if (!existsSync(promptPath)) {
    if (prompt === "default") {
      return null;
    }
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  return readFile(promptPath, "utf8");
}

export async function replaceTemplateVars(
  codebase: string,
  prompt?: string,
  templateVars: Record<string, string> = {}
): Promise<string> {
  if (!prompt) {
    return codebase;
  }

  const promptTemplate = await getPromptTemplate(prompt);
  return promptTemplate
    ? processPromptTemplate(promptTemplate, codebase, templateVars)
    : codebase;
}
