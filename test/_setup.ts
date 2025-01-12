import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

export const TEST_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__test__"
);

export function createTestDir() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
}

export function cleanupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

export function createTestFile(filename: string, content: string = "") {
  const filePath = path.join(TEST_DIR, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

export { beforeEach, afterEach, describe, it, expect, vi };
