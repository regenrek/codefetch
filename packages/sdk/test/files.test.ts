import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { collectFiles } from "../src/files";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { mkdtemp, writeFile, rm, mkdir, symlink } from "node:fs/promises";
import { normalizePathSeparators } from "../src/utils/path";

describe("File Collection", () => {
  let tempDir: string;
  let ig: any;

  // Helper to get relative paths consistently across platforms
  const getRelativePath = (fullPath: string, basePath: string): string => {
    return normalizePathSeparators(relative(basePath, fullPath));
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "codefetch-files-test-"));

    // Create a mock ignore instance that accepts any path
    ig = {
      ignores: () => false, // Never ignore any files
    };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("collectFiles", () => {
    test("should collect all files by default", async () => {
      // Create test files
      await writeFile(join(tempDir, "file1.js"), "content1");
      await writeFile(join(tempDir, "file2.ts"), "content2");
      await mkdir(join(tempDir, "subdir"), { recursive: true });
      await writeFile(join(tempDir, "subdir", "file3.md"), "content3");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(3);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toEqual([
        "file1.js",
        "file2.ts",
        "subdir/file3.md",
      ]);
    });

    test("should filter by file extensions", async () => {
      await writeFile(join(tempDir, "file1.js"), "content1");
      await writeFile(join(tempDir, "file2.ts"), "content2");
      await writeFile(join(tempDir, "file3.md"), "content3");
      await writeFile(join(tempDir, "file4.txt"), "content4");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: new Set([".js", ".ts"]),
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(2);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toEqual(["file1.js", "file2.ts"]);
    });

    test("should handle include directories", async () => {
      await mkdir(join(tempDir, "src"), { recursive: true });
      await mkdir(join(tempDir, "lib"), { recursive: true });
      await mkdir(join(tempDir, "test"), { recursive: true });

      await writeFile(join(tempDir, "src", "index.js"), "src content");
      await writeFile(join(tempDir, "lib", "utils.js"), "lib content");
      await writeFile(join(tempDir, "test", "test.js"), "test content");
      await writeFile(join(tempDir, "root.js"), "root content");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: [join(tempDir, "src"), join(tempDir, "lib")],
        verbose: 0,
      });

      expect(files).toHaveLength(2);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toEqual(["lib/utils.js", "src/index.js"]);
    });

    test("should handle exclude directories", async () => {
      await mkdir(join(tempDir, "src"), { recursive: true });
      await mkdir(join(tempDir, "node_modules"), { recursive: true });
      await mkdir(join(tempDir, "dist"), { recursive: true });

      await writeFile(join(tempDir, "src", "index.js"), "src content");
      await writeFile(join(tempDir, "node_modules", "pkg.js"), "pkg content");
      await writeFile(join(tempDir, "dist", "bundle.js"), "dist content");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: [join(tempDir, "node_modules"), join(tempDir, "dist")],
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(1);
      const relativePaths = files.map((f) => getRelativePath(f, tempDir));
      expect(relativePaths).toEqual(["src/index.js"]);
    });

    test("should handle include files pattern", async () => {
      await mkdir(join(tempDir, "src"), { recursive: true });
      await writeFile(join(tempDir, "src", "index.js"), "content1");
      await writeFile(join(tempDir, "src", "utils.js"), "content2");
      await writeFile(join(tempDir, "src", "test.js"), "content3");
      await writeFile(join(tempDir, "README.md"), "readme");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: [join(tempDir, "src/*.js"), join(tempDir, "README.md")],
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(4);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toEqual([
        "README.md",
        "src/index.js",
        "src/test.js",
        "src/utils.js",
      ]);
    });

    test("should handle exclude files pattern", async () => {
      await writeFile(join(tempDir, "file1.js"), "content1");
      await writeFile(join(tempDir, "file2.test.js"), "content2");
      await writeFile(join(tempDir, "file3.spec.js"), "content3");
      await writeFile(join(tempDir, "file4.js"), "content4");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: ["*.test.js", "*.spec.js"],
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(2);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toEqual(["file1.js", "file4.js"]);
    });

    test("should handle gitignore patterns", async () => {
      await writeFile(join(tempDir, "file1.js"), "content1");
      await writeFile(join(tempDir, "file2.log"), "content2");
      await writeFile(join(tempDir, "file3.tmp"), "content3");

      // Create mock ignore instance with patterns
      const igWithPatterns = {
        ignores: (path: string) => {
          return path.endsWith(".log") || path.endsWith(".tmp");
        },
      };

      const files = await collectFiles(tempDir, {
        ig: igWithPatterns,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(1);
      const relativePaths = files.map((f) => getRelativePath(f, tempDir));
      expect(relativePaths).toEqual(["file1.js"]);
    });

    test("should handle dot files", async () => {
      await writeFile(join(tempDir, ".env"), "secret");
      await writeFile(join(tempDir, ".gitignore"), "patterns");
      await writeFile(join(tempDir, "normal.js"), "content");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(3);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toEqual([".env", ".gitignore", "normal.js"]);
    });

    test("should follow symbolic links", async () => {
      await mkdir(join(tempDir, "real-dir"), { recursive: true });
      await writeFile(join(tempDir, "real-dir", "file.js"), "content");

      // Create symbolic link
      await symlink(
        join(tempDir, "real-dir"),
        join(tempDir, "link-dir"),
        "dir"
      );

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(2);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toContain("real-dir/file.js");
      expect(relativePaths).toContain("link-dir/file.js");
    });

    test("should handle complex combinations", async () => {
      // Create complex directory structure
      await mkdir(join(tempDir, "src", "components"), { recursive: true });
      await mkdir(join(tempDir, "src", "utils"), { recursive: true });
      await mkdir(join(tempDir, "test"), { recursive: true });
      await mkdir(join(tempDir, "node_modules"), { recursive: true });

      await writeFile(join(tempDir, "src", "index.js"), "entry");
      await writeFile(join(tempDir, "src", "index.ts"), "entry ts");
      await writeFile(join(tempDir, "src", "components", "App.jsx"), "app");
      await writeFile(join(tempDir, "src", "components", "App.css"), "styles");
      await writeFile(join(tempDir, "src", "utils", "helper.js"), "helper");
      await writeFile(join(tempDir, "test", "app.test.js"), "test");
      await writeFile(join(tempDir, "node_modules", "pkg.js"), "package");
      await writeFile(join(tempDir, "README.md"), "readme");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: new Set([".js", ".jsx", ".ts"]),
        excludeFiles: ["*.test.js"],
        includeFiles: null,
        excludeDirs: [join(tempDir, "node_modules")],
        includeDirs: [join(tempDir, "src")],
        verbose: 0,
      });

      expect(files).toHaveLength(4);
      const relativePaths = files
        .map((f) => getRelativePath(f, tempDir))
        .sort();
      expect(relativePaths).toEqual([
        "src/components/App.jsx",
        "src/index.js",
        "src/index.ts",
        "src/utils/helper.js",
      ]);
    });

    test("should handle special characters in paths", async () => {
      const specialDir = join(tempDir, "dir[with]brackets");
      await mkdir(specialDir, { recursive: true });
      await writeFile(join(specialDir, "file.js"), "content");

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: [specialDir],
        verbose: 0,
      });

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("dir[with]brackets");
    });

    test("should handle empty directories", async () => {
      await mkdir(join(tempDir, "empty"), { recursive: true });

      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 0,
      });

      expect(files).toHaveLength(0);
    });

    test("should handle non-existent include directories gracefully", async () => {
      const files = await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: [join(tempDir, "non-existent")],
        verbose: 0,
      });

      expect(files).toHaveLength(0);
    });

    test("should respect verbose logging", async () => {
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (msg: string) => logs.push(msg);

      await writeFile(join(tempDir, "file.js"), "content");

      await collectFiles(tempDir, {
        ig,
        extensionSet: null,
        excludeFiles: null,
        includeFiles: null,
        excludeDirs: null,
        includeDirs: null,
        verbose: 2,
      });

      console.log = originalLog;

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.includes("Scanning with patterns"))).toBe(
        true
      );
    });
  });
});
