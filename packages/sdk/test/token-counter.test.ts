import { describe, test, expect } from "vitest";
import { countTokens } from "../src/token-counter";
import type { TokenEncoder } from "../src/types";

describe("Token Counter", () => {
  describe("countTokens", () => {
    test("should count tokens with simple encoder", async () => {
      const text = "Hello, World!";
      const count = await countTokens(text, "simple");

      // Simple encoder counts words by splitting on whitespace and punctuation
      expect(count).toBe(2); // "Hello" and "World"
    });

    test("should handle empty string", async () => {
      const count = await countTokens("", "simple");
      expect(count).toBe(0);
    });

    test("should handle long text", async () => {
      const longText = "word ".repeat(1000);
      const count = await countTokens(longText, "simple");
      expect(count).toBe(1000); // 1000 words
    });

    test("should handle unicode characters", async () => {
      const unicodeText = "Hello 👋 World 🌍!";
      const count = await countTokens(unicodeText, "simple");

      // Simple encoder counts words (emojis might be counted as words)
      expect(count).toBe(4); // "Hello", "👋", "World", "🌍"
    });

    test("should handle newlines and whitespace", async () => {
      const text = "Line 1\n\nLine 2\t\tTabbed";
      const count = await countTokens(text, "simple");
      expect(count).toBe(5); // "Line", "1", "Line", "2", "Tabbed"
    });

    test("should count tokens with cl100k encoder", async () => {
      const text = "Hello, World!";
      const count = await countTokens(text, "cl100k");

      // cl100k should return a reasonable token count
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10); // "Hello, World!" is usually 3-4 tokens
    });

    test("should count tokens with o200k encoder", async () => {
      const text = "Hello, World!";
      const count = await countTokens(text, "o200k");

      // o200k should return a reasonable token count
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    test("should count tokens with p50k encoder", async () => {
      const text = "Hello, World!";
      const count = await countTokens(text, "p50k");

      // p50k should return a reasonable token count
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    test("should handle code snippets", async () => {
      const code = `
function hello() {
  console.log("Hello, World!");
}
`;
      const count = await countTokens(code, "simple");
      expect(count).toBe(6); // "function", "hello", "console", "log", "Hello", "World"
    });

    test("should handle markdown content", async () => {
      const markdown = `
# Title

This is a **bold** text with [link](https://example.com).

- Item 1
- Item 2

\`\`\`javascript
console.log("code");
\`\`\`
`;
      const count = await countTokens(markdown, "simple");
      expect(count).toBeGreaterThan(10); // Multiple words in the markdown
      expect(count).toBeLessThan(30); // But not too many
    });

    test("should handle different encoders for same text", async () => {
      const text = "The quick brown fox jumps over the lazy dog.";

      const simpleCount = await countTokens(text, "simple");
      const cl100kCount = await countTokens(text, "cl100k");
      const o200kCount = await countTokens(text, "o200k");
      const p50kCount = await countTokens(text, "p50k");

      // Simple encoder should count words
      expect(simpleCount).toBe(9); // 9 words in the sentence

      // All tokenizers use the same p50k model in this implementation
      expect(cl100kCount).toBe(p50kCount);
      expect(o200kCount).toBe(p50kCount);

      // All token counts should be positive
      expect(cl100kCount).toBeGreaterThan(0);
      expect(o200kCount).toBeGreaterThan(0);
      expect(p50kCount).toBeGreaterThan(0);
    });

    test("should handle invalid encoder gracefully", async () => {
      // Test with an invalid encoder
      const text = "Test text";
      const count = await countTokens(text, "invalid" as TokenEncoder);

      // Should still work, likely using the tokenizer
      expect(count).toBeGreaterThan(0);
    });

    test("should be consistent for repeated calls", async () => {
      const text = "Consistent text";
      const encoder: TokenEncoder = "cl100k";

      const count1 = await countTokens(text, encoder);
      const count2 = await countTokens(text, encoder);
      const count3 = await countTokens(text, encoder);

      expect(count1).toBe(count2);
      expect(count2).toBe(count3);
    });

    test("should handle special characters", async () => {
      const specialText = String.raw`Special chars: @#$%^&*()_+-={}[]|\:";<>?,./`;
      const count = await countTokens(specialText, "simple");
      // The regex splits on punctuation but some chars might form tokens
      expect(count).toBeGreaterThan(1);
      expect(count).toBeLessThan(10);
    });

    test("should handle very long text efficiently", async () => {
      // Create a large text
      const largeText = "Lorem ipsum ".repeat(100_000);

      const startTime = Date.now();
      const count = await countTokens(largeText, "simple");
      const endTime = Date.now();

      expect(count).toBe(200_000); // 2 words repeated 100k times
      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
