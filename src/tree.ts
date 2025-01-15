import fs from "node:fs";
import { join, basename } from "pathe";

function generateTree(
  dir: string,
  level: number,
  prefix = "",
  isLast = true,
  maxLevel = 2,
  currentLevel = 0
): string {
  if (currentLevel >= maxLevel) return "";

  let tree =
    currentLevel === 0
      ? ""
      : `${prefix}${isLast ? "└── " : "├── "}${basename(dir)}\n`;

  const files = fs.readdirSync(dir);
  const filteredFiles = files.filter(
    (file) => !file.startsWith(".") && file !== "node_modules"
  );

  for (const [index, file] of filteredFiles.entries()) {
    const filePath = join(dir, file);
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

  return tree;
}

export function generateProjectTree(baseDir: string, maxLevel = 2): string {
  return (
    "Project Structure:\n" + generateTree(baseDir, 1, "", true, maxLevel, 0)
  );
}
