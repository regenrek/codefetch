import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { generateProjectTree, generateProjectTreeFromFiles } from "../src/tree";
import { collectFilesAsTree } from "../src/files-tree";
import { FetchResultImpl } from "../src/fetch-result";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";

describe("Tree Generation", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "codefetch-tree-test-"));
  });

  describe("generateProjectTreeFromFiles", () => {
    test("should only include provided files", async () => {
      await writeFile(join(tempDir, "include-me.js"), "included");
      await writeFile(join(tempDir, "ignore-me.js"), "ignored");

      const tree = generateProjectTreeFromFiles(tempDir, [
        join(tempDir, "include-me.js"),
      ]);

      expect(tree).toContain("include-me.js");
      expect(tree).not.toContain("ignore-me.js");
    });

    test("should render nested directories from filtered file list", async () => {
      await mkdir(join(tempDir, "src", "components"), { recursive: true });
      await mkdir(join(tempDir, "docs"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "components", "button.tsx"),
        "component"
      );
      await writeFile(join(tempDir, "docs", "readme.md"), "# docs");

      const tree = generateProjectTreeFromFiles(
        tempDir,
        [join(tempDir, "src", "components", "button.tsx")],
        3
      );

      expect(tree).toContain("src");
      expect(tree).toContain("components");
      expect(tree).toContain("button.tsx");
      expect(tree).not.toContain("docs");
      expect(tree).not.toContain("readme.md");
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("generateProjectTree", () => {
    test("should generate tree for simple directory structure", async () => {
      // Create test files
      await writeFile(join(tempDir, "file1.txt"), "content1");
      await writeFile(join(tempDir, "file2.js"), "content2");

      const tree = generateProjectTree(tempDir, 2);

      expect(tree).toContain("Project Structure:");
      expect(tree).toContain("file1.txt");
      expect(tree).toContain("file2.js");
    });

    test("should handle nested directories", async () => {
      // Create nested structure
      await mkdir(join(tempDir, "src"), { recursive: true });
      await mkdir(join(tempDir, "src", "components"), { recursive: true });
      await writeFile(join(tempDir, "index.js"), "root");
      await writeFile(join(tempDir, "src", "app.js"), "app");
      await writeFile(
        join(tempDir, "src", "components", "button.js"),
        "button"
      );

      const tree = generateProjectTree(tempDir, 3);

      expect(tree).toContain("src");
      expect(tree).toContain("app.js");
      expect(tree).toContain("components");
      expect(tree).toContain("button.js");
    });

    test("should respect maxLevel parameter", async () => {
      // Create deep structure
      await mkdir(join(tempDir, "a", "b", "c", "d"), { recursive: true });
      await writeFile(join(tempDir, "a", "b", "c", "d", "deep.txt"), "deep");

      // Max level 2 should not show deep.txt
      const tree2 = generateProjectTree(tempDir, 2);
      expect(tree2).not.toContain("deep.txt");

      // Max level 4 should show deep.txt
      const tree4 = generateProjectTree(tempDir, 5);
      expect(tree4).toContain("deep.txt");
    });

    test("should filter hidden files and node_modules", async () => {
      // Create hidden files and node_modules
      await writeFile(join(tempDir, ".gitignore"), "hidden");
      await mkdir(join(tempDir, "node_modules"), { recursive: true });
      await writeFile(join(tempDir, "node_modules", "pkg.js"), "module");
      await writeFile(join(tempDir, "visible.js"), "visible");

      const tree = generateProjectTree(tempDir, 2);

      expect(tree).not.toContain(".gitignore");
      expect(tree).not.toContain("node_modules");
      expect(tree).toContain("visible.js");
    });
  });

  describe("collectFilesAsTree", () => {
    test("should create tree structure from file list", async () => {
      // Create test files
      await mkdir(join(tempDir, "src"), { recursive: true });
      await writeFile(join(tempDir, "index.js"), "root");
      await writeFile(join(tempDir, "src", "app.js"), "app");

      const files = [join(tempDir, "index.js"), join(tempDir, "src", "app.js")];

      const { root, totalSize, totalTokens } = await collectFilesAsTree(
        tempDir,
        files,
        { tokenEncoder: "simple" }
      );

      expect(root.type).toBe("directory");
      expect(root.children).toHaveLength(2);

      // Find index.js
      const indexFile = root.children?.find((c) => c.name === "index.js");
      expect(indexFile).toBeDefined();
      expect(indexFile?.type).toBe("file");
      expect(indexFile?.content).toBe("root");

      // Find src directory
      const srcDir = root.children?.find((c) => c.name === "src");
      expect(srcDir).toBeDefined();
      expect(srcDir?.type).toBe("directory");
      expect(srcDir?.children).toHaveLength(1);

      expect(totalSize).toBeGreaterThan(0);
      expect(totalTokens).toBeGreaterThan(0);
    });

    test("should handle deeply nested files", async () => {
      const deepPath = join(tempDir, "a", "b", "c");
      await mkdir(deepPath, { recursive: true });
      await writeFile(join(deepPath, "deep.txt"), "content");

      const files = [join(deepPath, "deep.txt")];

      const { root } = await collectFilesAsTree(tempDir, files);

      // Navigate through the tree structure
      const aDir = root.children?.find((c) => c.name === "a");
      expect(aDir?.type).toBe("directory");

      const bDir = aDir?.children?.find((c) => c.name === "b");
      expect(bDir?.type).toBe("directory");

      const cDir = bDir?.children?.find((c) => c.name === "c");
      expect(cDir?.type).toBe("directory");

      const deepFile = cDir?.children?.find((c) => c.name === "deep.txt");
      expect(deepFile?.type).toBe("file");
      expect(deepFile?.content).toBe("content");
    });

    test("should sort directories before files", async () => {
      await mkdir(join(tempDir, "zdir"), { recursive: true });
      await writeFile(join(tempDir, "afile.txt"), "a");
      await writeFile(join(tempDir, "zdir", "file.txt"), "z");

      const files = [
        join(tempDir, "afile.txt"),
        join(tempDir, "zdir", "file.txt"),
      ];

      const { root } = await collectFilesAsTree(tempDir, files);

      // Directory should come first despite "z" > "a"
      expect(root.children?.[0]?.name).toBe("zdir");
      expect(root.children?.[0]?.type).toBe("directory");
      expect(root.children?.[1]?.name).toBe("afile.txt");
      expect(root.children?.[1]?.type).toBe("file");
    });

    test("should calculate token counts", async () => {
      await writeFile(join(tempDir, "file.txt"), "Hello world from test");

      const files = [join(tempDir, "file.txt")];

      const { totalTokens } = await collectFilesAsTree(tempDir, files, {
        tokenEncoder: "simple",
      });

      // Simple encoder counts words
      expect(totalTokens).toBe(4); // "Hello", "world", "from", "test"
    });

    test("should handle empty files", async () => {
      await writeFile(join(tempDir, "empty.txt"), "");

      const files = [join(tempDir, "empty.txt")];

      const { root, totalSize, totalTokens } = await collectFilesAsTree(
        tempDir,
        files
      );

      const emptyFile = root.children?.find((c) => c.name === "empty.txt");
      expect(emptyFile?.content).toBe("");
      expect(totalSize).toBe(0);
      expect(totalTokens).toBe(0);
    });

    test("should set file metadata correctly", async () => {
      await writeFile(join(tempDir, "test.js"), "console.log('test');");

      const files = [join(tempDir, "test.js")];

      const { root } = await collectFilesAsTree(tempDir, files);

      const testFile = root.children?.find((c) => c.name === "test.js");
      expect(testFile?.language).toBe("javascript");
      expect(testFile?.size).toBeGreaterThan(0);
      expect(testFile?.lastModified).toBeInstanceOf(Date);
    });
  });

  describe("FetchResultImpl tree generation", () => {
    test("should convert tree to markdown format", async () => {
      await mkdir(join(tempDir, "src"), { recursive: true });
      await writeFile(join(tempDir, "README.md"), "# Test");
      await writeFile(join(tempDir, "src", "index.js"), "console.log('hi');");

      const files = [
        join(tempDir, "README.md"),
        join(tempDir, "src", "index.js"),
      ];

      const { root, totalSize, totalTokens } = await collectFilesAsTree(
        tempDir,
        files
      );

      const result = new FetchResultImpl(root, {
        totalFiles: files.length,
        totalSize,
        totalTokens,
        fetchedAt: new Date(),
        source: tempDir,
      });

      const markdown = result.toMarkdown();

      expect(markdown).toContain("Project Structure:");
      expect(markdown).toContain("README.md");
      expect(markdown).toContain("src");
      expect(markdown).toContain("index.js");
      expect(markdown).toContain("# Test");
      expect(markdown).toContain("console.log('hi');");
    });

    test("should use proper tree drawing characters", async () => {
      await mkdir(join(tempDir, "a"), { recursive: true });
      await mkdir(join(tempDir, "b"), { recursive: true });
      await writeFile(join(tempDir, "a", "file1.txt"), "1");
      await writeFile(join(tempDir, "b", "file2.txt"), "2");

      const files = [
        join(tempDir, "a", "file1.txt"),
        join(tempDir, "b", "file2.txt"),
      ];

      const { root } = await collectFilesAsTree(tempDir, files);

      const result = new FetchResultImpl(root, {
        totalFiles: 2,
        totalSize: 2,
        totalTokens: 2,
        fetchedAt: new Date(),
        source: tempDir,
      });

      const markdown = result.toMarkdown();
      const treeSection = markdown.split("\n\n")[0]; // Get just the tree part

      // Check for proper box drawing
      expect(treeSection).toContain("├── a");
      expect(treeSection).toContain("│   └── file1.txt");
      expect(treeSection).toContain("└── b");
      expect(treeSection).toContain("    └── file2.txt");
    });

    test("should handle single file", async () => {
      await writeFile(join(tempDir, "single.js"), "const x = 1;");

      const files = [join(tempDir, "single.js")];

      const { root, totalSize, totalTokens } = await collectFilesAsTree(
        tempDir,
        files
      );

      const result = new FetchResultImpl(root, {
        totalFiles: 1,
        totalSize,
        totalTokens,
        fetchedAt: new Date(),
        source: tempDir,
      });

      const markdown = result.toMarkdown();

      expect(markdown).toContain("single.js");
      expect(markdown).toContain("const x = 1;");
    });

    test("should include line numbers in file content", async () => {
      await writeFile(join(tempDir, "multiline.txt"), "line1\nline2\nline3");

      const files = [join(tempDir, "multiline.txt")];

      const { root, totalSize, totalTokens } = await collectFilesAsTree(
        tempDir,
        files
      );

      const result = new FetchResultImpl(root, {
        totalFiles: 1,
        totalSize,
        totalTokens,
        fetchedAt: new Date(),
        source: tempDir,
      });

      const markdown = result.toMarkdown();

      expect(markdown).toContain("1 | line1");
      expect(markdown).toContain("2 | line2");
      expect(markdown).toContain("3 | line3");
    });
  });
});
