import fs from "node:fs";
import path from "node:path";
import type { default as ignore } from "ignore";

export function resolveCodefetchPath(outputFile: string) {
  const codefetchDir = path.join(process.cwd(), "codefetch");

  // Create codefetch directory if it doesn't exist
  if (!fs.existsSync(codefetchDir)) {
    fs.mkdirSync(codefetchDir, { recursive: true });

    // Create .codefetchignore if it doesn't exist
    const ignorePath = path.join(process.cwd(), ".codefetchignore");
    if (!fs.existsSync(ignorePath)) {
      fs.writeFileSync(ignorePath, "codefetch/\n");
    }
  }

  return path.join(codefetchDir, outputFile);
}

export async function collectFiles(
  dir: string,
  options: {
    ig: ReturnType<typeof ignore>;
    extensionSet: Set<string> | null;
    excludeFiles: string[] | null;
    includeFiles: string[] | null;
    excludeDirs: string[] | null;
    includeDirs: string[] | null;
  }
): Promise<string[]> {
  const results: string[] = [];
  const list = await fs.promises.readdir(dir);

  // Move regex compilation outside the loop
  const excludePatterns = options.excludeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
  );
  const includePatterns = options.includeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*"))
  );

  for (const filename of list) {
    const filePath = path.join(dir, filename);
    const relPath = path.relative(process.cwd(), filePath);

    if (options.ig.ignores(relPath)) {
      continue;
    }

    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
      // Check directory filters
      const dirName = path.basename(filePath);
      if (options.excludeDirs && options.excludeDirs.includes(dirName)) {
        continue;
      }
      if (options.includeDirs && !options.includeDirs.includes(dirName)) {
        continue;
      }

      results.push(...(await collectFiles(filePath, options)));
    } else {
      // Check file filters
      if (
        excludePatterns &&
        excludePatterns.some((pattern) => pattern.test(filename))
      ) {
        continue;
      }
      if (
        includePatterns &&
        !includePatterns.some((pattern) => pattern.test(filename))
      ) {
        continue;
      }
      if (options.extensionSet) {
        const ext = path.extname(filename);
        if (!options.extensionSet.has(ext)) {
          continue;
        }
      }

      results.push(filePath);
    }
  }
  return results;
}

function generateTree(
  dir: string,
  level: number,
  prefix = "",
  isLast = true,
  maxLevel = 2,
  currentLevel = 0
): string {
  if (currentLevel >= maxLevel) return "";

  // Don't add root directory to output
  let tree =
    currentLevel === 0
      ? ""
      : `${prefix}${isLast ? "└── " : "├── "}${path.basename(dir)}\n`;

  try {
    const files = fs.readdirSync(dir);
    const filteredFiles = files.filter(
      (file) => !file.startsWith(".") && file !== "node_modules"
    );

    for (const [index, file] of filteredFiles.entries()) {
      const filePath = path.join(dir, file);
      const isDirectory = fs.statSync(filePath).isDirectory();
      const newPrefix =
        currentLevel === 0 ? "" : prefix + (isLast ? "    " : "│   ");
      const isLastItem = index === filteredFiles.length - 1;

      if (isDirectory) {
        tree += generateTree(
          filePath,
          level + 1,
          newPrefix,
          isLastItem,
          maxLevel,
          currentLevel + 1
        );
      } else if (currentLevel < maxLevel) {
        tree += `${newPrefix}${isLastItem ? "└── " : "├── "}${file}\n`;
      }
    }
  } catch {
    // Handle any file system errors silently
  }

  return tree;
}

export function generateProjectTree(baseDir: string, maxLevel = 2): string {
  return (
    "Project Structure:\n" + generateTree(baseDir, 1, "", true, maxLevel, 0)
  );
}
