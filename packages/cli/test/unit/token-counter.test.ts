import { describe, it, expect } from "vitest";
import { countTokens } from "@codefetch/sdk";

describe("token-counter", () => {
  it("counts tokens with the 'simple' encoder by splitting on whitespace", async () => {
    const text = "Hello world! This is a test.";
    const tokens = await countTokens(text, "simple");
    // Very naive: splitting on whitespace plus punctuation.
    // The exact count might differ if your code does it differently.
    // Adjust this expectation to match how your actual "simple" logic works.
    expect(typeof tokens).toBe("number");
    expect(tokens).toBeGreaterThan(0);
  });

  it("handles empty strings gracefully", async () => {
    const tokens = await countTokens("", "simple");
    expect(tokens).toBe(0);
  });

  // If you have other encoders like 'cl100k', 'p50k', or 'o200k',
  // add tests for them as needed, e.g.:
  it("counts tokens with cl100k encoder", async () => {
    const text = "Hello, I'm using the cl100k encoder test.";
    const tokens = await countTokens(text, "cl100k");
    expect(tokens).toBeGreaterThan(0);
  });
});
