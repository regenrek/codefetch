import fs from "node:fs";
import { join, basename, relative } from "pathe";

type DirectoryNode = {
  name: string;
  children: Map<string, DirectoryNode>;
  files: Set<string>;
};

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

function createDirectoryNode(name: string): DirectoryNode {
  return {
    name,
    children: new Map(),
    files: new Set(),
  };
}

function addFileToDirectoryTree(
  root: DirectoryNode,
  relativePath: string
): void {
  const parts = relativePath
    .split(/[/\\]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return;
  }

  const fileName = parts.pop()!;
  let current = root;

  for (const dirName of parts) {
    if (!current.children.has(dirName)) {
      current.children.set(dirName, createDirectoryNode(dirName));
    }
    current = current.children.get(dirName)!;
  }

  current.files.add(fileName);
}

function renderDirectoryTree(
  node: DirectoryNode,
  prefix = "",
  isLast = true,
  currentLevel = 0,
  maxLevel = 2
): string {
  let tree = "";

  if (currentLevel > 0) {
    tree += `${prefix}${isLast ? "└── " : "├── "}${node.name}\n`;
  }

  if (currentLevel >= maxLevel) {
    return tree;
  }

  const childPrefix =
    currentLevel === 0 ? "" : prefix + (isLast ? "    " : "│   ");

  const directoryChildren = [...node.children.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const fileChildren = [...node.files].sort();

  const entries: Array<
    { type: "dir"; node: DirectoryNode } | { type: "file"; name: string }
  > = [
    ...directoryChildren.map((child) => ({
      type: "dir" as const,
      node: child,
    })),
    ...fileChildren.map((name) => ({ type: "file" as const, name })),
  ];

  for (const [index, entry] of entries.entries()) {
    const childIsLast = index === entries.length - 1;

    if (entry.type === "dir") {
      tree += renderDirectoryTree(
        entry.node,
        childPrefix,
        childIsLast,
        currentLevel + 1,
        maxLevel
      );
    } else if (currentLevel < maxLevel) {
      tree += `${childPrefix}${childIsLast ? "└── " : "├── "}${entry.name}\n`;
    }
  }

  return tree;
}

export function generateProjectTreeFromFiles(
  baseDir: string,
  files: string[],
  maxLevel = 2
): string {
  const root = createDirectoryNode("");
  const normalizedBase = baseDir;

  for (const filePath of files) {
    const relativePath = relative(normalizedBase, filePath);
    if (!relativePath || relativePath.startsWith("..")) {
      continue;
    }
    addFileToDirectoryTree(root, relativePath);
  }

  return (
    "Project Structure:\n" + renderDirectoryTree(root, "", true, 0, maxLevel)
  );
}
