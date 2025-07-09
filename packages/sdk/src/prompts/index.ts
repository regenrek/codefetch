export { default as codegenPrompt } from "./codegen.js";
export { default as fixPrompt } from "./fix.js";
export { default as improvePrompt } from "./improve.js";
export { default as testgenPrompt } from "./testgen.js";

// Import all prompts for the prompts object
import codegenPrompt from "./codegen.js";
import fixPrompt from "./fix.js";
import improvePrompt from "./improve.js";
import testgenPrompt from "./testgen.js";

// Export as a single object for convenience
export const prompts = {
  codegen: codegenPrompt,
  fix: fixPrompt,
  improve: improvePrompt,
  testgen: testgenPrompt,
};

// Default export for convenient importing
export default prompts;
