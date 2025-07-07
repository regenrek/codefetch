import { existsSync } from "node:fs";
import { join } from "pathe";

const source = "/Users/kregenrek/projects/cli/codefetch/packages/cli";
const codefetchIgnorePath = join(source, ".codefetchignore");

console.log("source:", source);
console.log("codefetchIgnorePath:", codefetchIgnorePath);
console.log("existsSync result:", existsSync(codefetchIgnorePath));

// Also test with node:path
import { join as nodeJoin } from "node:path";
const codefetchIgnorePath2 = nodeJoin(source, ".codefetchignore");
console.log("\nUsing node:path:");
console.log("codefetchIgnorePath2:", codefetchIgnorePath2);
console.log("existsSync result:", existsSync(codefetchIgnorePath2));

// Test current directory
console.log("\nCurrent directory:", process.cwd());
const relativePath = ".codefetchignore";
console.log("Relative path exists:", existsSync(relativePath));