import { describe, it, expect } from "vitest";
import {
  filesToTree,
  treeToFiles,
  findNodeByPath,
  walkTree,
  calculateTreeMetrics,
  sortTree,
  filterTree,
} from "../src/tree-utils.js";
import type { FileContent } from "../src/markdown-content.js";

describe("Tree Utils Smoke Tests", () => {
  const mockFiles: FileContent[] = [
    { path: "src/index.ts", content: "export default {}" },
    { path: "src/utils/helper.ts", content: "export function help() {}" },
    { path: "README.md", content: "# Test Project" },
  ];

  it("should convert files to tree structure", () => {
    const tree = filesToTree(mockFiles);

    expect(tree).toBeDefined();
    expect(tree.type).toBe("directory");
    expect(tree.children).toBeDefined();
    expect(tree.children?.length).toBeGreaterThan(0);
  });

  it("should convert tree back to files", () => {
    const tree = filesToTree(mockFiles);
    const files = treeToFiles(tree);

    expect(files).toHaveLength(mockFiles.length);
    expect(files[0].path).toBeDefined();
    expect(files[0].content).toBeDefined();
  });

  it("should find node by path", () => {
    const tree = filesToTree(mockFiles);
    const node = findNodeByPath(tree, "src");

    expect(node).toBeDefined();
    expect(node?.type).toBe("directory");
  });

  it("should walk tree with callback", () => {
    const tree = filesToTree(mockFiles);
    let nodeCount = 0;

    walkTree(tree, () => {
      nodeCount++;
    });

    expect(nodeCount).toBeGreaterThan(0);
  });

  it("should calculate tree metrics", () => {
    const tree = filesToTree(mockFiles);
    const metrics = calculateTreeMetrics(tree);

    expect(metrics.totalFiles).toBe(3);
    expect(metrics.totalSize).toBeGreaterThan(0);
    expect(metrics.totalTokens).toBeDefined();
  });

  it("should sort tree nodes", () => {
    const tree = filesToTree(mockFiles);
    const sorted = sortTree(tree);

    expect(sorted).toBeDefined();
    expect(sorted.children).toBeDefined();
  });

  it("should filter tree based on predicate", () => {
    const tree = filesToTree(mockFiles);
    const filtered = filterTree(tree, (node) => !node.path.includes("utils"));

    expect(filtered).toBeDefined();
  });
});
