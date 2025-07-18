import { describe, it, expect } from "vitest";
import {
  createMarkdownStream,
  createTransformStream,
  collectStream,
  filterStream,
  mapStream,
} from "../src/streaming.js";
import type { FileContent } from "../src/markdown-content.js";

describe("Streaming API Smoke Tests", () => {
  const mockFiles: FileContent[] = [
    { path: "file1.ts", content: "console.log('hello');" },
    { path: "file2.ts", content: "export default {};" },
  ];

  async function* generateMockFiles(): AsyncGenerator<FileContent> {
    for (const file of mockFiles) {
      yield file;
    }
  }

  it("should create markdown stream", async () => {
    const stream = createMarkdownStream(generateMockFiles());

    expect(stream).toBeInstanceOf(ReadableStream);

    // Basic test that stream can be read
    const reader = stream.getReader();
    const { value, done } = await reader.read();
    expect(done).toBe(false);
    expect(value).toBeDefined();
    reader.releaseLock();
  });

  it("should create transform stream", async () => {
    const transform = createTransformStream<string>((file) => file.path);

    expect(transform).toBeInstanceOf(TransformStream);
    expect(transform.readable).toBeDefined();
    expect(transform.writable).toBeDefined();
  });

  it("should collect stream into array", async () => {
    const collected = await collectStream(generateMockFiles());

    expect(collected).toHaveLength(2);
    expect(collected[0].path).toBe("file1.ts");
    expect(collected[1].path).toBe("file2.ts");
  });

  it("should filter stream items", async () => {
    const filtered = filterStream(generateMockFiles(), (file) =>
      file.path.includes("file1")
    );

    const result = await collectStream(filtered);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("file1.ts");
  });

  it("should map stream items", async () => {
    const mapped = mapStream(generateMockFiles(), (file) => file.path);

    const result = await collectStream(mapped);
    expect(result).toEqual(["file1.ts", "file2.ts"]);
  });

  it("should handle async filter predicate", async () => {
    const filtered = filterStream(generateMockFiles(), async (file) => {
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 1));
      return file.path.includes("file2");
    });

    const result = await collectStream(filtered);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("file2.ts");
  });

  it("should handle async map function", async () => {
    const mapped = mapStream(generateMockFiles(), async (file) => {
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 1));
      return file.path.toUpperCase();
    });

    const result = await collectStream(mapped);
    expect(result).toEqual(["FILE1.TS", "FILE2.TS"]);
  });
});
