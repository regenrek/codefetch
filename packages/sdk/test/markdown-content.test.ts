import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FileContent } from "../src/markdown-content.js";

let tokenQueue: number[] = [];

vi.mock("../src/token-counter.js", () => ({
  countTokens: vi.fn(async () =>
    tokenQueue.length > 0 ? tokenQueue.shift()! : 0
  ),
}));

import {
  generateMarkdownFromContent,
  createMarkdownStream as createContentStream,
} from "../src/markdown-content.js";

async function streamToString(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += value ?? "";
  }
  return output;
}

describe("markdown-content", () => {
  const files: FileContent[] = [
    { path: "src/index.ts", content: "export const a = 1;" },
    { path: "src/utils/math.ts", content: "export const sum = (a,b)=>a+b;" },
  ];

  beforeEach(() => {
    tokenQueue = [];
  });

  it("generates markdown with tree structure and line numbers", async () => {
    tokenQueue = [5, 10];

    const markdown = await generateMarkdownFromContent(files, {
      includeTreeStructure: true,
    });

    expect(markdown).toContain("# Project Structure");
    expect(markdown).toContain("src/index.ts");
    expect(markdown).toContain("1 ");
    expect(markdown).toContain("```typescript");
  });

  it("truncates content when exceeding maxTokens", async () => {
    tokenQueue = [5, 50];

    const markdown = await generateMarkdownFromContent(files, {
      maxTokens: 20,
    });

    expect(markdown).toContain("... File truncated due to token limit ...");
  });

  it("streams markdown and truncates on token limit", async () => {
    tokenQueue = [5, 50];

    async function* fileStream(): AsyncGenerator<FileContent> {
      for (const file of files) {
        yield file;
      }
    }

    const stream = createContentStream(fileStream(), { maxTokens: 20 });
    const result = await streamToString(stream);

    expect(result).toContain("src/index.ts");
    expect(result).toContain("... File truncated due to token limit ...");
  });
});
