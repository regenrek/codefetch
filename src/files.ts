import fs from "node:fs";
import path from "node:path";
import type { default as ignore } from "ignore";

export async function collectFiles(
  dir: string,
  options: {
    ig: ReturnType<typeof ignore>;
    extensionSet: Set<string> | null;
    excludeFiles: string[] | null;
    includeFiles: string[] | null;
    excludeDirs: string[] | null;
    includeDirs: string[] | null;
  },
): Promise<string[]> {
  const results: string[] = [];
  const list = await fs.promises.readdir(dir);

  // Move regex compilation outside the loop
  const excludePatterns = options.excludeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*")),
  );
  const includePatterns = options.includeFiles?.map(
    (pattern) => new RegExp(pattern.replace(/\*/g, ".*")),
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
