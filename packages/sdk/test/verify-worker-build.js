// Verify Worker build without network dependencies
import * as worker from "../dist-worker/worker.mjs";

console.log("=== Worker Build Verification ===\n");

// Check all expected exports
const expectedExports = [
  "fetchFromWeb",
  "countTokens",
  "htmlToMarkdown",
  "isCloudflareWorker",
  "getCacheSizeLimit",
  "generateMarkdown",
  "VALID_ENCODERS",
  "VALID_LIMITERS",
  "VALID_PROMPTS",
];

console.log("Checking exports:");
let allExportsFound = true;
for (const exp of expectedExports) {
  const found = exp in worker;
  console.log(`  ${found ? "✓" : "✗"} ${exp}`);
  if (!found) allExportsFound = false;
}

// Check that Node-specific exports are NOT included
console.log("\nChecking excluded exports (should NOT be present):");
const excludedExports = ["collectFiles", "fetchFiles"];
let noExcludedExports = true;
for (const exp of excludedExports) {
  const found = exp in worker;
  console.log(`  ${found ? "✗" : "✓"} ${exp} is not exported`);
  if (found) noExcludedExports = false;
}

// Test basic functionality
console.log("\nBasic functionality tests:");

// 1. Environment detection
console.log(
  `  Environment: ${worker.isCloudflareWorker ? "Worker" : "Node.js"}`
);
console.log(`  Cache limit: ${worker.getCacheSizeLimit() / 1024 / 1024}MB`);

// 2. Constants
console.log(`  Valid encoders: ${[...worker.VALID_ENCODERS].join(", ")}`);

// 3. HTML conversion
const html = "<p>Test</p>";
const markdown = worker.htmlToMarkdown(html);
console.log(`  HTML->MD: "${html}" => "${markdown.trim()}"`);

// 4. Token counting (async)
worker
  .countTokens("test", "cl100k")
  .then((tokens) => {
    console.log(`  Token count: ${tokens} tokens for "test"`);

    // Summary
    console.log("\n=== Summary ===");
    if (allExportsFound && noExcludedExports) {
      console.log("✓ All checks passed!");
      console.log("✓ Worker build is ready for deployment");
    } else {
      console.log("✗ Some checks failed");
      process.exit(1);
    }
  })
  .catch((error_) => {
    console.error("  ✗ Token counting error:", error_.message);
    process.exit(1);
  });
