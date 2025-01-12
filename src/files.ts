import fs from "node:fs";
import path from "node:path";
import type { default as ignore } from "ignore";

export function resolveCodefetchPath(outputFile: string) {
  const codefetchDir = path.join(process.cwd(), "codefetch");

  // Create codefetch directory if it doesn't exist
  if (!fs.existsSync(codefetchDir)) {
    fs.mkdirSync(codefetchDir, { recursive: true });
  }

  return path.join(codefetchDir, outputFile);
}

export async function collectFiles(
  baseDir: string,
  options: {
    ig: ReturnType<typeof ignore>;
    extensionSet: Set<string> | null;
    excludeFiles: string[] | null;
    includeFiles: string[] | null;
    excludeDirs: string[] | null;
    includeDirs: string[] | null;
    verbose: number;
  }
): Promise<string[]> {
  const {
    ig,
    extensionSet,
    excludeFiles,
    includeFiles,
    excludeDirs,
    includeDirs,
    verbose,
  } = options;

  function logVerbose(message: string, level: number) {
    if (verbose >= level) {
      console.log(message);
    }
  }

  logVerbose(`Scanning directory: ${baseDir}`, 2);

  const results: string[] = [];
  const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });

  // Check if current directory should be included when includeDirs is specified
  const relativeBaseDir = path.relative(process.cwd(), baseDir);
  if (includeDirs && relativeBaseDir) {
    const shouldInclude = includeDirs.some(
      (dir) =>
        relativeBaseDir === dir || relativeBaseDir.startsWith(dir + path.sep)
    );
    if (!shouldInclude) {
      logVerbose(
        `Skipping directory not in include list: ${relativeBaseDir}`,
        2
      );
      return results;
    }
  }

  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath);
    const ignoreCheckPath = entry.isDirectory()
      ? `${relativePath}/`
      : relativePath;

    if (entry.isDirectory()) {
      // Directory handling
      if (
        excludeDirs?.some(
          (dir) =>
            relativePath === dir || relativePath.startsWith(dir + path.sep)
        )
      ) {
        logVerbose(`Skipping excluded directory: ${relativePath}`, 2);
        continue;
      }

      if (ig.ignores(ignoreCheckPath)) {
        logVerbose(`Skipping ignored directory: ${relativePath}`, 2);
        continue;
      }

      results.push(...(await collectFiles(fullPath, options)));
    } else if (entry.isFile()) {
      // File handling
      if (ig.ignores(ignoreCheckPath)) {
        logVerbose(`Skipping ignored file: ${relativePath}`, 2);
        continue;
      }
      if (excludeFiles?.some((pattern) => matchPattern(entry.name, pattern))) {
        logVerbose(`Skipping excluded file: ${relativePath}`, 2);
        continue;
      }
      if (
        includeFiles &&
        !includeFiles.some((pattern) => matchPattern(entry.name, pattern))
      ) {
        logVerbose(`Skipping non-included file: ${relativePath}`, 2);
        continue;
      }
      if (extensionSet && !extensionSet.has(path.extname(entry.name))) {
        logVerbose(
          `Skipping file with non-matching extension: ${relativePath}`,
          2
        );
        continue;
      }

      logVerbose(`Adding file: ${relativePath}`, 2);
      results.push(fullPath);
    }
  }

  return results;
}

function matchPattern(filename: string, pattern: string): boolean {
  // Convert glob pattern to regex pattern
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regexPattern}$`).test(filename);
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
