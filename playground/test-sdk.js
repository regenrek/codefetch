#!/usr/bin/env node

import {
  collectFiles,
  countTokens,
  generateMarkdown,
  findProjectRoot,
  processPromptTemplate,
  DEFAULT_IGNORE_PATTERNS,
  VALID_PROMPTS,
  VALID_ENCODERS,
  VALID_LIMITERS,
  SUPPORTED_MODELS,
} from "../packages/sdk/dist/index.mjs";
import ignore from "ignore";
import { resolve, join } from "path";
import { existsSync, readFileSync } from "fs";

console.log("🧪 Testing codefetch-sdk functionality\n");

// Test 1: Constants
console.log("1️⃣ Testing Constants:");
console.log("Valid Prompts:", VALID_PROMPTS);
console.log("Valid Encoders:", VALID_ENCODERS);
console.log("Valid Limiters:", VALID_LIMITERS);
console.log(
  "Supported Models sample:",
  Array.from(SUPPORTED_MODELS).slice(0, 3)
);
console.log(
  "Default Ignore Patterns (first 5 lines):",
  DEFAULT_IGNORE_PATTERNS.split("\n").slice(0, 5).join("\n")
);
console.log("✅ Constants loaded successfully\n");

// Test 2: findProjectRoot
console.log("2️⃣ Testing findProjectRoot:");
const testDir = process.cwd();
const projectRoot = findProjectRoot(testDir);
console.log("Current dir:", testDir);
console.log("Project root:", projectRoot);
console.log("✅ findProjectRoot works\n");

// Test 3: Token counting
console.log("3️⃣ Testing countTokens:");
const testText = "Hello world! This is a test of the token counter.";
try {
  const simpleTokens = await countTokens(testText, "simple");
  console.log(`Simple encoder: "${testText}" = ${simpleTokens} tokens`);

  const cl100kTokens = await countTokens(testText, "cl100k");
  console.log(`cl100k encoder: "${testText}" = ${cl100kTokens} tokens`);
  console.log("✅ Token counting works\n");
} catch (error) {
  console.error("❌ Token counting failed:", error.message);
}

// Test 4: Collect files
console.log("4️⃣ Testing collectFiles:");
try {
  const ig = ignore().add(
    DEFAULT_IGNORE_PATTERNS.split("\n").filter(
      (line) => line && !line.startsWith("#")
    )
  );
  ig.add("node_modules/"); // Ignore node_modules

  // Collect JS/TS files in current directory
  const files = await collectFiles(".", {
    ig,
    extensionSet: new Set([".js", ".ts"]),
    verbose: 0,
  });

  console.log(`Found ${files.length} JS/TS files`);
  files.slice(0, 3).forEach((file) => console.log(`  - ${file}`));
  console.log("✅ File collection works\n");
} catch (error) {
  console.error("❌ File collection failed:", error);
}

// Test 5: Prompt template processing
console.log("5️⃣ Testing processPromptTemplate:");
try {
  const template = `Hello {{NAME}}! 
Your message: {{MESSAGE}}
Current codebase:
{{CURRENT_CODEBASE}}`;

  const codebase = "Test codebase content here";
  const vars = {
    NAME: "Developer",
    MESSAGE: "Testing the SDK",
  };

  const processed = await processPromptTemplate(template, codebase, vars);
  console.log("Template processed:");
  console.log(processed);
  console.log("✅ Template processing works\n");
} catch (error) {
  console.error("❌ Template processing failed:", error);
}

// Test 6: Generate markdown
console.log("6️⃣ Testing generateMarkdown:");
try {
  const currentFile = new URL(import.meta.url).pathname; // ES module way to get current file
  const testFiles = [currentFile];
  const markdown = await generateMarkdown(testFiles, {
    maxTokens: 1000,
    verbose: 0,
    projectTree: 2,
    tokenEncoder: "simple",
    disableLineNumbers: false,
    tokenLimiter: "truncated",
  });

  console.log("Generated markdown preview (first 200 chars):");
  console.log(markdown.substring(0, 200) + "...");
  console.log(`Total length: ${markdown.length} characters`);
  console.log("✅ Markdown generation works\n");
} catch (error) {
  console.error("❌ Markdown generation failed:", error.message);
}

console.log("🎉 SDK testing complete!");
